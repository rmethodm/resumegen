<?php

namespace App\Console\Commands;

use App\Data\AiPrompts;
use App\Mail\JobMatchesDigestMail;
use App\Models\JobListing;
use App\Models\JobSearch;
use App\Services\AiService;
use App\Services\JobSearchService;
use App\Services\UserLimits;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Throwable;

class RunJobAlertsCommand extends Command
{
    protected $signature = 'jobs:run-alerts';

    protected $description = 'Re-run saved job searches and email a digest of postings not seen before';

    /**
     * Only postings scoring at least this well are worth an email. Below it, the
     * digest becomes noise and people stop opening it.
     */
    private const SCORE_FLOOR = 60;

    public function handle(JobSearchService $jobs, AiService $ai): int
    {
        JobSearch::where('is_alerting', true)
            ->with('user', 'resume')
            ->each(function (JobSearch $search) use ($jobs, $ai): void {
                try {
                    $this->processSearch($search, $jobs, $ai);
                } catch (Throwable $e) {
                    // One broken search must not stop the rest of the run.
                    report($e);
                    $this->error("Search #{$search->id} failed: {$e->getMessage()}");
                }
            });

        return self::SUCCESS;
    }

    private function processSearch(JobSearch $search, JobSearchService $jobs, AiService $ai): void
    {
        $fresh = $this->storeUnseen($search, $jobs->search($search->toQuery()));
        $search->update(['last_run_at' => now()]);

        if ($fresh->isEmpty()) {
            return;
        }

        $this->score($search, $fresh, $ai);

        $worthSending = $fresh->filter(
            fn (JobListing $l): bool => $l->fit_score === null || $l->fit_score >= self::SCORE_FLOOR,
        );

        // Mark every fresh listing notified, not just the ones mailed — a posting
        // that scored too low must not resurface in tomorrow's digest.
        JobListing::whereIn('id', $fresh->pluck('id'))->update(['notified_at' => now()]);

        if ($worthSending->isEmpty()) {
            return;
        }

        Mail::to($search->user->email)->queue(
            new JobMatchesDigestMail($search->user, $search, $worthSending),
        );

        $this->info("Search #{$search->id}: mailed {$worthSending->count()} of {$fresh->count()} new.");
    }

    /**
     * Insert only postings this search has never produced before. The unique
     * index on (job_search_id, source, external_id) is what makes "new" real.
     *
     * @param  array<array<string, mixed>>  $listings
     * @return Collection<int, JobListing>
     */
    private function storeUnseen(JobSearch $search, array $listings): Collection
    {
        $existing = $search->listings()->get(['source', 'external_id'])
            ->map(fn (JobListing $l): string => $l->source.':'.$l->external_id)
            ->flip();

        return collect($listings)
            ->reject(fn (array $row): bool => $existing->has($row['source'].':'.$row['external_id']))
            ->map(fn (array $row): JobListing => $search->listings()->create([
                'source' => $row['source'],
                'external_id' => $row['external_id'],
                'title' => $row['title'],
                'company' => $row['company'] ?: null,
                'location' => $row['location'] ?: null,
                'url' => $row['url'] ?: null,
                'description' => $row['description'] ?: null,
                'salary_min' => $row['salary_min'],
                'salary_max' => $row['salary_max'],
                'posted_at' => $row['posted_at'] ?: null,
            ]))
            ->values();
    }

    /**
     * Attach fit scores when the search is tied to a resume and the account has
     * AI budget left. Scoring is best-effort — a digest of unscored postings
     * still beats no digest.
     *
     * @param  Collection<int, JobListing>  $listings
     */
    private function score(JobSearch $search, Collection $listings, AiService $ai): void
    {
        if (! $search->resume || ! config('ai.enabled') || ! UserLimits::canUseAi($search->user)) {
            return;
        }

        try {
            $reply = $ai->chat(
                AiPrompts::build('rank_jobs', [
                    'experience' => $search->resume->experience ?? [],
                    'skills' => $search->resume->skills ?? [],
                    'summary' => $search->resume->summary ?? '',
                    'listings' => $listings->map(fn (JobListing $l): array => [
                        'id' => (string) $l->id,
                        'title' => $l->title,
                        'company' => $l->company,
                        'description' => mb_substr((string) $l->description, 0, 4000),
                    ])->all(),
                ]),
                [
                    'user' => $search->user,
                    'feature' => 'rank_jobs',
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens' => 2000,
                ],
            );
        } catch (Throwable $e) {
            report($e);

            return;
        }

        $byId = $listings->keyBy(fn (JobListing $l): string => (string) $l->id);

        foreach (json_decode($reply, true)['scores'] ?? [] as $row) {
            $listing = $byId->get((string) ($row['id'] ?? ''));

            $listing?->update([
                'fit_score' => max(0, min(100, (int) ($row['score'] ?? 0))),
                'fit_reason' => trim((string) ($row['reason'] ?? '')),
            ]);
        }
    }
}
