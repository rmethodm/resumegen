<?php

namespace App\Services\JobBoards;

use Illuminate\Support\Facades\Http;
use Throwable;

class AdzunaBoard implements JobBoard
{
    private const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

    public function key(): string
    {
        return 'adzuna';
    }

    public function isConfigured(): bool
    {
        return (bool) config('jobs.adzuna.app_id') && (bool) config('jobs.adzuna.app_key');
    }

    public function search(JobQuery $query): array
    {
        $params = [
            'app_id' => config('jobs.adzuna.app_id'),
            'app_key' => config('jobs.adzuna.app_key'),
            'what' => $query->keywords,
            'results_per_page' => config('jobs.results_per_board', 25),
            'content-type' => 'application/json',
        ];

        if (! $query->isNational() && $query->location !== '') {
            $params['where'] = $query->location;
            $params['distance'] = $query->radiusMiles();
        }

        try {
            $country = config('jobs.adzuna.country', 'us');
            $results = Http::timeout(10)
                ->get(self::BASE_URL."/{$country}/search/1", $params)
                ->throw()
                ->json('results') ?? [];
        } catch (Throwable $e) {
            report($e);

            return [];
        }

        return array_map(fn (array $row): array => [
            'source' => $this->key(),
            'external_id' => (string) ($row['id'] ?? ''),
            'title' => (string) ($row['title'] ?? ''),
            'company' => (string) ($row['company']['display_name'] ?? ''),
            'location' => (string) ($row['location']['display_name'] ?? ''),
            'url' => (string) ($row['redirect_url'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'salary_min' => isset($row['salary_min']) ? (int) $row['salary_min'] : null,
            'salary_max' => isset($row['salary_max']) ? (int) $row['salary_max'] : null,
            'posted_at' => $row['created'] ?? null,
        ], $results);
    }
}
