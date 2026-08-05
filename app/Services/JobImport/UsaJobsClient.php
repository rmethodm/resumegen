<?php

namespace App\Services\JobImport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UsaJobsClient
{
    public function enabled(): bool
    {
        return filled(config('services.usajobs.key')) && filled(config('services.usajobs.email'));
    }

    /**
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    public function search(string $keyword, ?string $location): array
    {
        if (! $this->enabled()) {
            return [];
        }

        $response = Http::timeout(6)
            ->retry(2, 200, throw: false)
            ->withHeaders([
                'Host' => 'data.usajobs.gov',
                'User-Agent' => (string) config('services.usajobs.email'),
                'Authorization-Key' => (string) config('services.usajobs.key'),
            ])
            ->get('https://data.usajobs.gov/api/search', array_filter([
                'Keyword' => $keyword,
                'LocationName' => $location,
                'ResultsPerPage' => 20,
            ]));

        if (! $response->successful()) {
            Log::warning('usajobs search failed', ['status' => $response->status()]);

            return [];
        }

        $items = $response->json('SearchResult.SearchResultItems', []);

        return collect($items)
            ->map(function (array $item): array {
                $job = $item['MatchedObjectDescriptor'] ?? [];
                $pay = $job['PositionRemuneration'][0] ?? [];

                return [
                    'source' => 'usajobs',
                    'external_id' => (string) ($job['PositionID'] ?? ''),
                    'title' => $job['PositionTitle'] ?? 'Untitled role',
                    'company' => $job['OrganizationName'] ?? null,
                    'location' => $job['PositionLocationDisplay'] ?? null,
                    'url' => $job['PositionURI'] ?? null,
                    'salary' => $this->formatSalary($pay['MinimumRange'] ?? null, $pay['MaximumRange'] ?? null),
                    'description' => $job['UserArea']['Details']['JobSummary'] ?? null,
                    'posted_at' => $job['PublicationStartDate'] ?? null,
                ];
            })
            ->filter(fn (array $job): bool => $job['external_id'] !== '')
            ->values()
            ->all();
    }

    private function formatSalary(?string $min, ?string $max): ?string
    {
        if (! $min && ! $max) {
            return null;
        }

        $format = fn (string $value): string => '$'.number_format((float) $value / 1000, 0).'K';

        return $min && $max ? $format($min).'–'.$format($max) : $format($min ?: $max);
    }
}
