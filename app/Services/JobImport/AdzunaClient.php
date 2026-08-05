<?php

namespace App\Services\JobImport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdzunaClient
{
    public function enabled(): bool
    {
        return filled(config('services.adzuna.app_id')) && filled(config('services.adzuna.app_key'));
    }

    /**
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    public function search(string $keyword, ?string $location): array
    {
        if (! $this->enabled()) {
            return [];
        }

        $country = (string) config('services.adzuna.country', 'us');

        $response = Http::timeout(6)
            ->retry(2, 200, throw: false)
            ->get("https://api.adzuna.com/v1/api/jobs/{$country}/search/1", array_filter([
                'app_id' => config('services.adzuna.app_id'),
                'app_key' => config('services.adzuna.app_key'),
                'what' => $keyword,
                'where' => $location,
                'results_per_page' => 20,
                'content-type' => 'application/json',
            ]));

        if (! $response->successful()) {
            Log::warning('adzuna search failed', ['status' => $response->status()]);

            return [];
        }

        return collect($response->json('results', []))
            ->map(fn (array $job): array => [
                'source' => 'adzuna',
                'external_id' => (string) ($job['id'] ?? ''),
                'title' => $job['title'] ?? 'Untitled role',
                'company' => $job['company']['display_name'] ?? null,
                'location' => $job['location']['display_name'] ?? null,
                'url' => $job['redirect_url'] ?? null,
                'salary' => $this->formatSalary($job['salary_min'] ?? null, $job['salary_max'] ?? null),
                'description' => $job['description'] ?? null,
                'posted_at' => $job['created'] ?? null,
            ])
            ->filter(fn (array $job): bool => $job['external_id'] !== '')
            ->values()
            ->all();
    }

    private function formatSalary(?float $min, ?float $max): ?string
    {
        if (! $min && ! $max) {
            return null;
        }

        $format = fn (float $value): string => '$'.number_format($value / 1000, 0).'K';

        return $min && $max ? $format($min).'–'.$format($max) : $format($min ?? $max);
    }
}
