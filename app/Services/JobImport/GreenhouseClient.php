<?php

namespace App\Services\JobImport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GreenhouseClient
{
    /**
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    public function fetch(string $companySlug): array
    {
        $response = Http::timeout(6)
            ->retry(2, 200, throw: false)
            ->get("https://boards-api.greenhouse.io/v1/boards/{$companySlug}/jobs", [
                'content' => 'true',
            ]);

        if (! $response->successful()) {
            Log::warning('greenhouse fetch failed', ['company' => $companySlug, 'status' => $response->status()]);

            return [];
        }

        $company = Str::headline($companySlug);

        return collect($response->json('jobs', []))
            ->map(fn (array $job) => [
                'source' => 'greenhouse',
                'external_id' => (string) ($job['id'] ?? ''),
                'title' => $job['title'] ?? 'Untitled role',
                'company' => $company,
                'location' => $job['location']['name'] ?? null,
                'url' => $job['absolute_url'] ?? null,
                'salary' => null,
                'description' => $job['content'] ?? null,
                'posted_at' => $job['updated_at'] ?? null,
            ])
            ->filter(fn (array $job): bool => $job['external_id'] !== '')
            ->values()
            ->all();
    }
}
