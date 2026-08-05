<?php

namespace App\Services\JobImport;

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
        ];
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
