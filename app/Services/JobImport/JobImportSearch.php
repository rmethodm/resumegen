<?php

namespace App\Services\JobImport;

use App\Models\ScrapedJob;

class JobImportSearch
{
    public function __construct(
        private readonly AdzunaClient $adzuna,
        private readonly UsaJobsClient $usaJobs,
    ) {}

    /**
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    public function search(string $keyword, ?string $location): array
    {
        return [
            ...$this->adzuna->search($keyword, $location),
            ...$this->usaJobs->search($keyword, $location),
            ...$this->scrapedPool($keyword, $location),
        ];
    }

    /**
     * Blends in listings the scheduled scrape (Greenhouse/Lever/career
     * pages) already collected into the shared pool — see JobScrapePool.
     *
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    private function scrapedPool(string $keyword, ?string $location): array
    {
        return ScrapedJob::query()
            ->where('title', 'like', "%{$keyword}%")
            ->when($location, fn ($query, $location) => $query->where('location', 'like', "%{$location}%"))
            ->limit(20)
            ->get()
            ->map(fn (ScrapedJob $job): array => [
                'source' => $job->source,
                'external_id' => $job->external_id,
                'title' => $job->title,
                'company' => $job->company,
                'location' => $job->location,
                'url' => $job->url,
                'salary' => $job->salary,
                'description' => $job->description,
                'posted_at' => $job->posted_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    public function availableSources(): array
    {
        return array_values(array_filter([
            $this->adzuna->enabled() ? 'adzuna' : null,
            $this->usaJobs->enabled() ? 'usajobs' : null,
        ]));
    }
}
