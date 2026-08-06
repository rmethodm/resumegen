<?php

namespace App\Services\JobImport;

use App\Models\ScrapedJob;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class JobScrapePool
{
    public function __construct(
        private readonly GreenhouseClient $greenhouse,
        private readonly LeverClient $lever,
        private readonly CareerPageScraper $careerPages,
    ) {}

    public function refresh(): void
    {
        foreach (config('job_scrape_sources.greenhouse', []) as $slug) {
            $this->withPoliteness("greenhouse:{$slug}", fn () => $this->store($this->greenhouse->fetch($slug)));
        }

        foreach (config('job_scrape_sources.lever', []) as $slug) {
            $this->withPoliteness("lever:{$slug}", fn () => $this->store($this->lever->fetch($slug)));
        }

        foreach (config('job_scrape_sources.career_pages', []) as $url) {
            $this->withPoliteness("career_page:{$url}", function () use ($url) {
                $job = $this->careerPages->fetch($url);

                if ($job !== null) {
                    $this->store([$job]);
                }
            });
        }
    }

    private function withPoliteness(string $key, callable $fetch): void
    {
        $cacheKey = "job-scrape:{$key}";

        if (Cache::has($cacheKey)) {
            return;
        }

        try {
            $fetch();
        } catch (Throwable $e) {
            Log::warning('job scrape source failed', ['source' => $key, 'error' => $e->getMessage()]);

            return;
        }

        $hours = (int) config('job_scrape_sources.min_interval_hours', 6);
        Cache::put($cacheKey, true, now()->addHours($hours));
    }

    /**
     * @param  list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>  $jobs
     */
    private function store(array $jobs): void
    {
        foreach ($jobs as $job) {
            ScrapedJob::updateOrCreate(
                ['source' => $job['source'], 'external_id' => $job['external_id']],
                collect($job)->except(['source', 'external_id'])->all(),
            );
        }
    }
}
