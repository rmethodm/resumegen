<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\JobSearch;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use App\Services\JobBoards\JobQuery;
use App\Services\JobSearchService;
use App\Services\JobUrlImporter;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class JobSearchController extends Controller
{
    /**
     * Ranking sends one batch to the model, so the batch has to stay small
     * enough to fit a single completion.
     */
    private const MAX_RANKED = 25;

    public function __construct(private AiService $ai) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Jobs/Index', [
            'searches' => JobSearch::where('user_id', $user->id)
                ->withCount('listings')
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (JobSearch $search) => $this->presentSearch($search))
                ->values(),
            'resumes' => Resume::where('user_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name']),
            'sources' => $this->configuredSources(),
        ]);
    }

    /**
     * Run a live search. Deliberately free of AI — searching never spends the
     * user's monthly quota; only the explicit rank action does.
     */
    public function search(Request $request, JobSearchService $jobs): JsonResponse
    {
        $data = $request->validate([
            'keywords' => ['required', 'string', 'max:200'],
            'location' => ['nullable', 'string', 'max:120'],
            'scope' => ['required', 'in:local,state,national'],
        ]);

        $results = $jobs->search(new JobQuery(
            $data['keywords'],
            $data['location'] ?? '',
            $data['scope'],
        ));

        return response()->json([
            'results' => $results,
            'sources' => $this->configuredSources(),
        ]);
    }

    /**
     * Score a batch of postings against a resume. The model only judges fit —
     * it never sees a search box and never invents a listing.
     *
     * Deliberately records no JobPairing. One call scores a whole page of listings the
     * user is still browsing, so a pairing per listing would attribute jobs they never
     * tailored for — and at a non-zero pricing.job_cents, bill for them. Ranking is the
     * step before choosing a job; the pairing belongs to the builder call that follows.
     */
    public function rank(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'resume_id' => ['required', 'integer'],
            'listings' => ['required', 'array', 'min:1', 'max:'.self::MAX_RANKED],
            'listings.*.id' => ['required'],
            'listings.*.title' => ['required', 'string', 'max:255'],
            'listings.*.company' => ['nullable', 'string', 'max:255'],
            'listings.*.description' => ['nullable', 'string', 'max:4000'],
        ]);

        $resume = Resume::findOrFail($data['resume_id']);
        // ResumePolicy::view() is a stub that always denies; 'update' is the
        // ability that actually carries the ownership check.
        $this->authorize('update', $resume);

        if (! UserLimits::canUseAi($user)) {
            return $this->limitReached($user);
        }

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('rank_jobs', [
                    'experience' => $resume->experience ?? [],
                    'skills' => $resume->skills ?? [],
                    'summary' => $resume->summary ?? '',
                    'listings' => $data['listings'],
                ]),
                [
                    'user' => $user,
                    'feature' => 'rank_jobs',
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens' => 2000,
                ],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        return response()->json([
            'scores' => $this->parseScores($reply, $data['listings']),
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }

    /**
     * Pull a posting off any URL the boards do not cover. This is the scraping
     * path: fetch the page, let the model read it, no per-site selectors.
     */
    public function importUrl(Request $request, JobUrlImporter $importer): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['url' => ['required', 'url', 'max:500']]);

        if (! UserLimits::canUseAi($user)) {
            return $this->limitReached($user);
        }

        try {
            $listing = $importer->import($data['url'], $user);
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'Could not read that posting. Check the link and try again.'], 503);
        }

        return response()->json([
            'listing' => $listing,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:120'],
            'keywords' => ['required', 'string', 'max:200'],
            'location' => ['nullable', 'string', 'max:120'],
            'scope' => ['required', 'in:local,state,national'],
            'resume_id' => ['nullable', 'integer', 'exists:resumes,id'],
            'is_alerting' => ['boolean'],
        ]);

        if (! empty($data['resume_id'])) {
            $this->authorize('update', Resume::findOrFail($data['resume_id']));
        }

        JobSearch::create($data + ['user_id' => $request->user()->id]);

        return back()->with('success', 'Search saved.');
    }

    public function update(Request $request, JobSearch $jobSearch): RedirectResponse
    {
        $this->authorize('update', $jobSearch);

        $jobSearch->update($request->validate([
            'label' => ['sometimes', 'string', 'max:120'],
            'is_alerting' => ['sometimes', 'boolean'],
        ]));

        return back();
    }

    public function destroy(JobSearch $jobSearch): RedirectResponse
    {
        $this->authorize('delete', $jobSearch);
        $jobSearch->delete();

        return back()->with('success', 'Search deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSearch(JobSearch $search): array
    {
        return [
            'id' => $search->id,
            'label' => $search->label,
            'keywords' => $search->keywords,
            'location' => $search->location,
            'scope' => $search->scope,
            'resume_id' => $search->resume_id,
            'is_alerting' => $search->is_alerting,
            'listings_count' => $search->listings_count,
            'last_run_at' => $search->last_run_at?->toDayDateTimeString(),
        ];
    }

    /**
     * Which boards actually have credentials. The UI says so plainly rather
     * than letting an unconfigured source look like "no jobs found".
     *
     * @return array<int, string>
     */
    private function configuredSources(): array
    {
        return collect(app(JobSearchService::class)->configuredKeys())->values()->all();
    }

    private function limitReached(User $user): JsonResponse
    {
        return response()->json([
            'error' => UserLimits::aiLimitMessage($user),
            'limit' => UserLimits::aiMonthlyLimit($user),
            'used' => UserLimits::aiRequestsThisMonth($user),
            'resets_at' => now()->startOfMonth()->addMonth()->format('M j'),
        ], 402);
    }

    /**
     * Keep only scores that point at a listing we actually sent. A model that
     * hallucinates an id must not be able to attach a score to nothing.
     *
     * @param  array<array<string, mixed>>  $listings
     * @return array<string, array{score: int, reason: string}>
     */
    private function parseScores(string $reply, array $listings): array
    {
        $sent = collect($listings)->pluck('id')->map(fn ($id): string => (string) $id)->flip();
        $decoded = json_decode($reply, true);

        return collect($decoded['scores'] ?? [])
            ->filter(fn ($row): bool => is_array($row) && isset($row['id']) && $sent->has((string) $row['id']))
            ->mapWithKeys(fn (array $row): array => [(string) $row['id'] => [
                'score' => max(0, min(100, (int) ($row['score'] ?? 0))),
                'reason' => trim((string) ($row['reason'] ?? '')),
            ]])
            ->all();
    }
}
