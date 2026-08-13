<?php

namespace App\Services\JobBoards;

use Illuminate\Support\Facades\Http;
use Throwable;

class UsaJobsBoard implements JobBoard
{
    private const BASE_URL = 'https://data.usajobs.gov/api/search';

    public function key(): string
    {
        return 'usajobs';
    }

    public function isConfigured(): bool
    {
        return (bool) config('jobs.usajobs.key') && (bool) config('jobs.usajobs.email');
    }

    public function search(JobQuery $query): array
    {
        $params = [
            'Keyword' => $query->keywords,
            'ResultsPerPage' => config('jobs.results_per_board', 25),
        ];

        if (! $query->isNational() && $query->location !== '') {
            $params['LocationName'] = $query->location;
            $params['Radius'] = $query->radiusMiles();
        }

        try {
            $items = Http::withHeaders([
                'Authorization-Key' => config('jobs.usajobs.key'),
                'User-Agent' => config('jobs.usajobs.email'),
                'Host' => 'data.usajobs.gov',
            ])->timeout(10)
                ->get(self::BASE_URL, $params)
                ->throw()
                ->json('SearchResult.SearchResultItems') ?? [];
        } catch (Throwable $e) {
            report($e);

            return [];
        }

        return array_map(function (array $item): array {
            $job = $item['MatchedObjectDescriptor'] ?? [];
            $pay = $job['PositionRemuneration'][0] ?? [];

            return [
                'source' => $this->key(),
                'external_id' => (string) ($item['MatchedObjectId'] ?? ''),
                'title' => (string) ($job['PositionTitle'] ?? ''),
                'company' => (string) ($job['OrganizationName'] ?? ''),
                'location' => (string) ($job['PositionLocationDisplay'] ?? ''),
                'url' => (string) ($job['PositionURI'] ?? ''),
                'description' => (string) ($job['UserArea']['Details']['JobSummary'] ?? $job['QualificationSummary'] ?? ''),
                'salary_min' => isset($pay['MinimumRange']) ? (int) $pay['MinimumRange'] : null,
                'salary_max' => isset($pay['MaximumRange']) ? (int) $pay['MaximumRange'] : null,
                'posted_at' => $job['PublicationStartDate'] ?? null,
            ];
        }, $items);
    }
}
