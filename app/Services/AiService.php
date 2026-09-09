<?php

namespace App\Services;

use App\Models\User;
use OpenAI\Laravel\Facades\OpenAI;

/**
 * Thin wrapper around the OpenAI chat completions API for resume bullet
 * rewriting. Every call is metered into `ai_requests` via AiUsageLimiter's
 * quota check in the controller — this class does not enforce limits itself.
 */
class AiService
{
    private const MODEL = 'gpt-4o-mini';

    /**
     * Per-1,000-token pricing in micro-cents (1 cent = 1,000,000 micro-cents),
     * a point-in-time snapshot of OpenAI's published per-token rates as of
     * 2026-09-09. Verify against https://openai.com/api/pricing before
     * relying on this for real spend decisions — it is not fetched
     * dynamically and will drift.
     *
     * @var array<string, array{prompt: float, completion: float}>
     */
    private const PRICING_PER_1K_TOKENS_MICRO_CENTS = [
        'gpt-4o-mini' => ['prompt' => 15000.0, 'completion' => 60000.0],
        'gpt-4o' => ['prompt' => 250000.0, 'completion' => 1000000.0],
    ];

    public static function costMicroCents(string $model, int $promptTokens, int $completionTokens): int
    {
        $rates = self::PRICING_PER_1K_TOKENS_MICRO_CENTS[$model] ?? null;

        if ($rates === null) {
            return 0;
        }

        $cost = ($promptTokens / 1000) * $rates['prompt']
            + ($completionTokens / 1000) * $rates['completion'];

        return (int) round($cost);
    }

    /**
     * @return array{text: string, prompt_tokens: int, completion_tokens: int}
     */
    public function rewriteBullet(User $user, string $bullet, ?string $targetRole = null): array
    {
        $prompt = $targetRole !== null && $targetRole !== ''
            ? "Rewrite this resume bullet point to be more impactful, targeting a {$targetRole} role. Keep it factual, one sentence, no fabricated numbers:\n\n{$bullet}"
            : "Rewrite this resume bullet point to be more impactful and concise. Keep it factual, one sentence, no fabricated numbers:\n\n{$bullet}";

        $response = OpenAI::chat()->create([
            'model' => self::MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.5,
        ]);

        $text = trim($response->choices[0]->message->content ?? $bullet);
        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $user->aiRequests()->create([
            'feature' => 'bullet_rewrite',
            'model' => self::MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'text' => $text,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
        ];
    }
}
