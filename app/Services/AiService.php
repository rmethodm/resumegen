<?php

namespace App\Services;

use App\Models\AiRequest;
use App\Models\User;
use OpenAI\Contracts\ClientContract;
use Throwable;

class AiService
{
    public function __construct(private ClientContract $client) {}

    /**
     * Send a single-prompt chat completion, log the request, and return the reply text.
     *
     * @param  array{model?: string, user?: User|null, feature?: string|null}  $options
     */
    public function chat(string $prompt, array $options = []): string
    {
        $model = $options['model'] ?? config('ai.model');
        $user = $options['user'] ?? null;
        $feature = $options['feature'] ?? null;

        try {
            $response = $this->client->chat()->create([
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            $promptTokens = $response->usage->promptTokens;
            $completionTokens = $response->usage->completionTokens;
            $totalTokens = $response->usage->totalTokens;

            $this->log($user, $feature, $model, $promptTokens, $completionTokens, $totalTokens, 'success');

            return $response->choices[0]->message->content ?? '';
        } catch (Throwable $e) {
            $this->log($user, $feature, $model, 0, 0, 0, 'error');

            throw $e;
        }
    }

    private function log(
        ?User $user,
        ?string $feature,
        string $model,
        int $promptTokens,
        int $completionTokens,
        int $totalTokens,
        string $status,
    ): void {
        AiRequest::create([
            'user_id' => $user?->id,
            'feature' => $feature,
            'model' => $model,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $totalTokens,
            'estimated_cost_cents' => $this->estimateCostCents($model, $promptTokens, $completionTokens),
            'status' => $status,
        ]);
    }

    private function estimateCostCents(string $model, int $promptTokens, int $completionTokens): int
    {
        $pricing = config("ai.pricing.{$model}");
        if (! $pricing) {
            return 0;
        }

        $cents = ($promptTokens / 1000) * $pricing['input']
            + ($completionTokens / 1000) * $pricing['output'];

        return (int) round($cents);
    }
}
