<?php

namespace App\Services;

use App\Exceptions\AiDisabledException;
use App\Exceptions\ModerationException;
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
     * @param  array{model?: string, user?: User|null, feature?: string|null, response_format?: array<string,string>, max_tokens?: int, messages?: array<array{role: string, content: string}>}  $options
     */
    public function chat(string $prompt, array $options = []): string
    {
        if (! config('ai.enabled')) {
            throw new AiDisabledException;
        }

        $model = $options['model'] ?? config('ai.model');
        $user = $options['user'] ?? null;
        $feature = $options['feature'] ?? null;
        $maxTokens = $options['max_tokens'] ?? config('ai.max_completion_tokens', 1000);

        $this->moderate($prompt, $user, $feature, $model);

        try {
            $params = [
                'model' => $model,
                'messages' => $options['messages'] ?? [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'user' => $this->userId($user),
                'max_tokens' => $maxTokens,
            ];

            if (isset($options['response_format'])) {
                $params['response_format'] = $options['response_format'];
            }

            $response = $this->client->chat()->create($params);

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

    /**
     * Pre-screen user text with OpenAI's free moderations endpoint. Flagged input
     * is logged and rejected before it ever reaches the chat completion endpoint.
     */
    private function moderate(string $text, ?User $user, ?string $feature, string $model): void
    {
        $result = $this->client->moderations()->create([
            'input' => $text,
            'user' => $this->userId($user),
        ]);

        if ($result->results[0]->flagged ?? false) {
            $this->log($user, $feature, $model, 0, 0, 0, 'flagged', $text);

            throw new ModerationException;
        }
    }

    private function userId(?User $user): string
    {
        return $user ? 'user_'.$user->id : 'guest';
    }

    private function log(
        ?User $user,
        ?string $feature,
        string $model,
        int $promptTokens,
        int $completionTokens,
        int $totalTokens,
        string $status,
        ?string $flaggedText = null,
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
            'flagged_text' => $flaggedText,
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
