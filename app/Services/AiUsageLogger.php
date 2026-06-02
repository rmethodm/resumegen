<?php

namespace App\Services;

use App\Models\AiModelRate;
use App\Models\AiUsageLog;
use Illuminate\Contracts\Auth\Authenticatable;

class AiUsageLogger
{
    public static function log(
        ?Authenticatable $user,
        string $provider,
        string $model,
        string $feature,
        int $inputTokens,
        int $outputTokens,
    ): void {
        try {
            $rate = AiModelRate::where('provider', $provider)
                ->where('model', $model)
                ->where('effective_from', '<=', today())
                ->orderByDesc('effective_from')
                ->first();

            $costUsd = 0.0;
            if ($rate) {
                $costUsd = ($inputTokens / 1_000_000 * $rate->input_cost_per_million)
                         + ($outputTokens / 1_000_000 * $rate->output_cost_per_million);
            }

            AiUsageLog::create([
                'user_id'       => $user?->getAuthIdentifier(),
                'provider'      => $provider,
                'model'         => $model,
                'feature'       => $feature,
                'input_tokens'  => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd'      => $costUsd,
            ]);
        } catch (\Throwable) {
            // never break the caller
        }
    }
}
