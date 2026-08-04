<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin OpenAI chat wrapper for resume rewrite / summary.
 * No auto-save — callers present text for user accept.
 */
final class OpenAiResumeAssistant
{
    public function enabled(): bool
    {
        return (bool) config('ai.enabled')
            && filled(config('ai.openai.api_key'));
    }

    /**
     * @return list<string> Up to 3 rewrite options
     */
    public function rewriteBullet(
        string $bullet,
        string $targetRole = '',
        string $jobDescription = '',
    ): array {
        $bullet = trim($bullet);
        if ($bullet === '') {
            throw new RuntimeException('Bullet text is required.');
        }

        $system = <<<'PROMPT'
You rewrite resume bullets. Rules:
- Keep all facts; never invent employers, titles, metrics, or tools.
- Prefer active voice and a strong opening verb.
- One line per option, max ~30 words.
- Return JSON: {"options":["...","...","..."]} with 2–3 options only.
PROMPT;

        $user = 'Target role: '.($targetRole !== '' ? $targetRole : '(none)')."\n";
        if (trim($jobDescription) !== '') {
            $user .= "Job description excerpt:\n".mb_substr($jobDescription, 0, 1500)."\n\n";
        }
        $user .= "Bullet to rewrite:\n{$bullet}";

        $content = $this->complete($system, $user, 400);
        $options = $this->extractOptions($content);

        if ($options === []) {
            // Fallback: treat whole response as one option if JSON fails.
            $flat = trim($content);
            if ($flat !== '') {
                $options = [mb_substr($flat, 0, 300)];
            }
        }

        return array_slice($options, 0, 3);
    }

    public function generateSummary(
        string $targetRole,
        string $headline,
        string $existingSummary,
        string $experienceContext,
        string $jobDescription = '',
    ): string {
        $system = <<<'PROMPT'
You write professional resume summaries. Rules:
- 2–4 sentences, first person omitted (no "I").
- No invented employers, degrees, or metrics.
- Tailor to the target role when provided.
- Return plain text only (no markdown, no JSON).
PROMPT;

        $user = 'Target role: '.($targetRole !== '' ? $targetRole : '(none)')."\n"
            .'Headline: '.($headline !== '' ? $headline : '(none)')."\n";
        if (trim($jobDescription) !== '') {
            $user .= "Job description excerpt:\n".mb_substr($jobDescription, 0, 1500)."\n\n";
        }
        if (trim($existingSummary) !== '') {
            $user .= "Current summary (improve or keep facts):\n{$existingSummary}\n\n";
        }
        $user .= "Experience context:\n".mb_substr($experienceContext, 0, 2500);

        return trim($this->complete($system, $user, 350));
    }

    private function complete(string $system, string $user, int $maxTokens): string
    {
        if (! $this->enabled()) {
            throw new RuntimeException('AI is not enabled. Set AI_ENABLED=true and OPENAI_API_KEY.');
        }

        $base = (string) config('ai.openai.base_url');
        $model = (string) config('ai.openai.model');
        $timeout = (int) config('ai.openai.timeout', 30);

        try {
            $response = Http::withToken((string) config('ai.openai.api_key'))
                ->timeout($timeout)
                ->acceptJson()
                ->post("{$base}/chat/completions", [
                    'model' => $model,
                    'temperature' => 0.4,
                    'max_tokens' => $maxTokens,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                ]);
        } catch (ConnectionException $e) {
            throw new RuntimeException('AI provider unreachable: '.$e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                'AI provider error (HTTP '.$response->status().'): '.mb_substr($response->body(), 0, 200),
            );
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('AI provider returned empty content.');
        }

        return trim($content);
    }

    /**
     * @return list<string>
     */
    private function extractOptions(string $content): array
    {
        // Strip markdown fences if present.
        $json = $content;
        if (preg_match('/\{.*\}/s', $content, $m) === 1) {
            $json = $m[0];
        }

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $options = $decoded['options'] ?? null;
        if (! is_array($options)) {
            return [];
        }

        $out = [];
        foreach ($options as $option) {
            if (is_string($option) && trim($option) !== '') {
                $out[] = trim($option);
            }
        }

        return $out;
    }
}
