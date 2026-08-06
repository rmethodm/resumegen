<?php

namespace App\Services\JobImport;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LeverClient
{
    /**
     * @return list<array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}>
     */
    public function fetch(string $companySlug): array
    {
        $response = Http::timeout(6)
            ->retry(2, 200, throw: false)
            ->get("https://api.lever.co/v0/postings/{$companySlug}", [
                'mode' => 'json',
            ]);

        if (! $response->successful()) {
            Log::warning('lever fetch failed', ['company' => $companySlug, 'status' => $response->status()]);

            return [];
        }

        $company = Str::headline($companySlug);

        return collect($response->json())
            ->map(fn (array $job) => [
                'source' => 'lever',
                'external_id' => (string) ($job['id'] ?? ''),
                'title' => $job['text'] ?? 'Untitled role',
                'company' => $company,
                'location' => $job['categories']['location'] ?? null,
                'url' => $job['hostedUrl'] ?? null,
                'salary' => null,
                'description' => $job['descriptionPlain'] ?? null,
                'posted_at' => isset($job['createdAt']) ? Carbon::createFromTimestampMs($job['createdAt'])->toIso8601String() : null,
            ])
            ->filter(fn (array $job): bool => $job['external_id'] !== '')
            ->values()
            ->all();
    }
}
