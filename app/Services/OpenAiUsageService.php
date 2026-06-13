<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OpenAiUsageService
{
    private const COSTS_URL = 'https://api.openai.com/v1/organization/costs';

    /**
     * Total OpenAI-billed cost (in cents) for the window, or null when the
     * Admin key is missing or the API call fails. Cached for one hour.
     */
    public function totalCostCents(CarbonInterface $start, CarbonInterface $end): ?int
    {
        $key = config('ai.admin_key');
        if (empty($key)) {
            return null;
        }

        $cacheKey = 'openai_costs_'.$start->timestamp.'_'.$end->timestamp;

        return Cache::remember($cacheKey, now()->addHour(), function () use ($key, $start, $end): ?int {
            try {
                $response = Http::withToken($key)
                    ->timeout(10)
                    ->get(self::COSTS_URL, [
                        'start_time' => $start->timestamp,
                        'end_time' => $end->timestamp,
                        'bucket_width' => '1d',
                        'limit' => 180,
                    ]);

                if ($response->failed()) {
                    return null;
                }

                $dollars = collect($response->json('data', []))
                    ->flatMap(fn (array $bucket): array => $bucket['results'] ?? [])
                    ->sum(fn (array $result): float => (float) data_get($result, 'amount.value', 0));

                return (int) round($dollars * 100);
            } catch (Throwable $e) {
                Log::warning('OpenAI costs fetch failed', ['message' => $e->getMessage()]);

                return null;
            }
        });
    }
}
