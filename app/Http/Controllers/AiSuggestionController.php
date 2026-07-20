<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\CoverLetter;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use App\Services\JobPairingService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class AiSuggestionController extends Controller
{
    public function __construct(private AiService $ai, private JobPairingService $pairings) {}

    public function rewriteBullet(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate(['text' => ['required', 'string', 'max:8000']]);

        return $this->run($request->user(), 'rewrite_bullet', ['text' => $data['text']],
            fn (string $reply): array => ['suggestion' => trim($reply)],
            null, $resume->target_company, $resume->target_title);
    }

    /**
     * Return the questions a weak bullet fails to answer, rather than answering them for the user.
     * The user supplies the facts; only they know them, and only they can defend them in an interview.
     */
    public function critiqueBullet(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate(['text' => ['required', 'string', 'max:8000']]);

        return $this->run($request->user(), 'critique_bullet', ['text' => $data['text']],
            fn (string $reply): array => ['questions' => $this->splitQuestions($reply)],
            null, $resume->target_company, $resume->target_title);
    }

    public function summary(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (empty($resume->experience) && empty($resume->skills)) {
            abort(422, 'Add experience or skills before generating a summary.');
        }

        $input = [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        $cacheKey = 'ai_summary_'.$resume->id.'_'.md5(json_encode($input));

        return $this->run($request->user(), 'generate_summary', $input,
            fn (string $reply): array => ['suggestion' => trim($reply)],
            $cacheKey, $resume->target_company, $resume->target_title,
        );
    }

    public function atsKeywords(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $data = $request->validate([
            'role' => ['nullable', 'string', 'max:200'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);
        $role = $data['role'] ?? $request->user()->target_role ?? '';
        $jobDescription = $data['job_description'] ?? $resume->target_job_description ?? '';

        $input = [
            'role' => $role,
            'job_description' => $jobDescription,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        $cacheKey = 'ai_ats_'.$resume->id.'_'.md5(json_encode($input));

        return $this->run($request->user(), 'ats_keywords', $input,
            fn (string $reply): array => ['keywords' => $this->splitKeywords($reply)],
            // Identity comes from the resume's target, never the per-request role field —
            // that is free text and would mint a new pairing each time the wording changed.
            $cacheKey, $resume->target_company, $resume->target_title,
        );
    }

    /**
     * Draft a cover letter body from the letter's linked resume.
     *
     * The linked resume is required, not optional: the prompt forbids inventing employers or
     * accomplishments, so with no resume there is nothing to ground the letter in.
     */
    public function coverLetterDraft(Request $request, CoverLetter $letter): JsonResponse
    {
        $this->authorize('update', $letter);

        $data = $request->validate([
            'role' => ['nullable', 'string', 'max:200'],
            'company' => ['nullable', 'string', 'max:200'],
            'job_description' => ['nullable', 'string', 'max:10000'],
            'tone' => ['nullable', 'in:formal,friendly,confident'],
        ]);

        $resume = $letter->resume;

        if ($resume === null) {
            abort(422, 'Link a resume first — the letter is written from its experience and skills.');
        }

        $input = [
            'tone' => $data['tone'] ?? 'formal',
            'role' => ($data['role'] ?? null) ?: $request->user()->target_role,
            'company' => ($data['company'] ?? null) ?: null,
            'job_description' => ($data['job_description'] ?? null) ?: $resume->target_job_description,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        // A cover letter names its own company, so it can identify the job even when the
        // linked resume has no target set. Falls back to the resume's target otherwise.
        return $this->run($request->user(), 'cover_letter', $input,
            fn (string $reply): array => ['body' => trim($reply)],
            null,
            ($data['company'] ?? null) ?: $resume->target_company,
            ($data['role'] ?? null) ?: $resume->target_title);
    }

    /**
     * Gate, call OpenAI, and shape the JSON response. Shared by all actions.
     *
     * @param  array<string, mixed>  $input
     * @param  callable(string): array<string, mixed>  $shape
     */
    private function run(
        User $user,
        string $feature,
        array $input,
        callable $shape,
        ?string $cacheKey = null,
        ?string $company = null,
        ?string $title = null,
    ): JsonResponse {
        $this->recordPairing($user, $company, $title);

        if ($cacheKey && Cache::has($cacheKey)) {
            return response()->json(array_merge($shape(Cache::get($cacheKey)), [
                'remaining' => UserLimits::aiRemaining($user),
            ]));
        }

        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => UserLimits::aiLimitMessage($user),
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
                'resets_at' => now()->startOfMonth()->addMonth()->format('M j'),
            ], 402);
        }

        try {
            $reply = $this->ai->chat(
                AiPrompts::build($feature, $input),
                ['user' => $user, 'feature' => $feature],
            );

            $shaped = $shape($reply);
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        if ($cacheKey) {
            Cache::put($cacheKey, $reply, now()->addDay());
        }

        return response()->json(array_merge($shaped, [
            'remaining' => UserLimits::aiRemaining($user),
        ]));
    }

    /**
     * Record which job this AI call was made against.
     *
     * Instrumentation only — prices are 0, so nothing is charged and nothing is gated.
     * A call with no company or title falls into the reserved __general__ pairing rather
     * than being dropped, or non-job work would be invisible in the data.
     *
     * ponytail: the pairing is recorded but not yet stamped onto ai_requests. Attribution
     * only powers the refund window and the abuse fuse, neither of which is live at $0,
     * and threading it through AiService::log() would touch a file that diverges between
     * branches. Add it when refunds ship.
     */
    private function recordPairing(User $user, ?string $company, ?string $title): void
    {
        if (filled($company) && filled($title)) {
            $this->pairings->resolveForJob($user, $company, $title);

            return;
        }

        $this->pairings->resolveGeneral($user);
    }

    /**
     * @return array<int, string>
     */
    private function splitQuestions(string $reply): array
    {
        return collect(explode("\n", $reply))
            ->map(fn (string $q): string => trim($q, " \t\n\r\0\x0B-•*0123456789."))
            ->filter()
            ->take(3)
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function splitKeywords(string $reply): array
    {
        return collect(preg_split('/[,\n]+/', $reply) ?: [])
            ->map(fn (string $k): string => trim($k, " \t\n\r\0\x0B-•*"))
            ->filter()
            ->take(20)
            ->values()
            ->all();
    }
}
