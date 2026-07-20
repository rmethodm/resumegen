<?php

namespace App\Services;

use App\Exceptions\AiDisabledException;
use App\Exceptions\ModerationException;
use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use OpenAI\Contracts\ClientContract;
use Throwable;

class AiService
{
    private const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

    private const ANTHROPIC_VERSION = '2023-06-01';

    public function __construct(private ClientContract $client) {}

    /**
     * Send a single-prompt chat completion, log the request, and return the reply text.
     *
     * Both providers land here so there is one moderation pass, one ai_requests
     * log, and one place the UserLimits gate has to guard.
     *
     * @param  array{provider?: string, model?: string, user?: User|null, feature?: string|null, response_format?: array<string,string>, max_tokens?: int, messages?: array<array{role: string, content: string}>}  $options
     */
    public function chat(string $prompt, array $options = []): string
    {
        if (! config('ai.enabled')) {
            throw new AiDisabledException;
        }

        $provider = $options['provider'] ?? config('ai.provider', 'openai');
        $model = $options['model'] ?? ($provider === 'anthropic'
            ? config('ai.anthropic_model')
            : config('ai.model'));
        $user = $options['user'] ?? null;
        $feature = $options['feature'] ?? null;
        $maxTokens = $options['max_tokens'] ?? config('ai.max_completion_tokens', 1000);
        $messages = $options['messages'] ?? [
            ['role' => 'user', 'content' => $prompt],
        ];
        $wantsJson = ($options['response_format']['type'] ?? null) === 'json_object';

        $this->moderate($prompt, $user, $feature, $model);

        try {
            [$text, $promptTokens, $completionTokens] = $provider === 'anthropic'
                ? $this->anthropicChat($messages, $model, $maxTokens, $wantsJson)
                : $this->openAiChat($messages, $model, $maxTokens, $user, $options['response_format'] ?? null);

            $this->log($user, $feature, $model, $promptTokens, $completionTokens, $promptTokens + $completionTokens, 'success');

            return $text;
        } catch (Throwable $e) {
            $this->log($user, $feature, $model, 0, 0, 0, 'error');

            throw $e;
        }
    }

    /**
     * @param  array<array{role: string, content: string}>  $messages
     * @param  array<string, string>|null  $responseFormat
     * @return array{0: string, 1: int, 2: int}
     */
    private function openAiChat(array $messages, string $model, int $maxTokens, ?User $user, ?array $responseFormat): array
    {
        $params = [
            'model' => $model,
            'messages' => $messages,
            'user' => $this->userId($user),
            'max_tokens' => $maxTokens,
        ];

        if ($responseFormat) {
            $params['response_format'] = $responseFormat;
        }

        $response = $this->client->chat()->create($params);

        return [
            $response->choices[0]->message->content ?? '',
            $response->usage->promptTokens,
            $response->usage->completionTokens,
        ];
    }

    /**
     * @param  array<array{role: string, content: string}>  $messages
     * @return array{0: string, 1: int, 2: int}
     */
    private function anthropicChat(array $messages, string $model, int $maxTokens, bool $wantsJson): array
    {
        // ponytail: Anthropic has no response_format. Prefilling the assistant turn with
        // an open brace forces JSON and is re-prepended below. Swap for tool-use if a
        // caller ever needs a guaranteed schema rather than merely valid JSON.
        if ($wantsJson) {
            $messages[] = ['role' => 'assistant', 'content' => '{'];
        }

        $response = Http::withHeaders([
            'x-api-key' => config('ai.anthropic_key'),
            'anthropic-version' => self::ANTHROPIC_VERSION,
        ])->timeout(60)->post(self::ANTHROPIC_URL, [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => $maxTokens,
        ])->throw()->json();

        $text = $response['content'][0]['text'] ?? '';

        return [
            $wantsJson ? '{'.$text : $text,
            $response['usage']['input_tokens'] ?? 0,
            $response['usage']['output_tokens'] ?? 0,
        ];
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
            'estimated_cost_micro_cents' => $this->estimateCostMicroCents($model, $promptTokens, $completionTokens),
            'status' => $status,
            'flagged_text' => $flaggedText,
        ]);
    }

    /**
     * Estimate request cost in micro-cents (1 cent = 1,000,000).
     *
     * config('ai.pricing') is denominated in cents per 1,000 tokens, and a gpt-4o-mini
     * call lands around 0.05 cents — so rounding to whole cents here recorded 0 for
     * every OpenAI request, including a 15k-token page import. Scale before rounding:
     * the rounding that remains is at a millionth of a cent, well below anything the
     * spend alarm or the usage reports care about.
     */
    private function estimateCostMicroCents(string $model, int $promptTokens, int $completionTokens): int
    {
        $pricing = config("ai.pricing.{$model}");
        if (! $pricing) {
            return 0;
        }

        $cents = ($promptTokens / 1000) * $pricing['input']
            + ($completionTokens / 1000) * $pricing['output'];

        return (int) round($cents * 1_000_000);
    }
}
