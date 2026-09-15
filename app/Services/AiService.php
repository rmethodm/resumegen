<?php

namespace App\Services;

use App\Models\StarterProfile;
use App\Models\User;
use OpenAI\Laravel\Facades\OpenAI;
use RuntimeException;

/**
 * Thin wrapper around the OpenAI chat completions API for orphaned resume AI
 * helpers (`reviewResume`, `rewriteSection`). No live HTTP entry points in v1 —
 * this class does not enforce credit limits itself.
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
     * @return array{text: string, prompt_tokens: int, completion_tokens: int, ai_request_id: int}
     */
    public function rewriteSection(User $user, string $text, string $detail): array
    {
        $prompt = "Rewrite this resume summary to address the following feedback: {$detail}\n\n"
            ."Keep it factual, concise, and do not invent facts. Return only the rewritten summary.\n\n{$text}";

        $response = OpenAI::chat()->create([
            'model' => self::MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.5,
        ]);

        $rewritten = trim($response->choices[0]->message->content ?? $text);

        if ($rewritten === '') {
            throw new RuntimeException('Invalid section rewrite response.');
        }

        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $aiRequest = $user->aiRequests()->create([
            'feature' => 'section_rewrite',
            'model' => self::MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'text' => $rewritten,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'ai_request_id' => $aiRequest->id,
        ];
    }

    /**
     * @return array{text: string, prompt_tokens: int, completion_tokens: int, ai_request_id: int}
     */
    public function draftQaAnswer(User $user, string $question, StarterProfile $profile): array
    {
        $resume = $user->resumes()->latest('updated_at')->first();

        $context = collect([
            $profile->full_name,
            $profile->headline,
            $profile->target_role,
            $resume?->summary,
        ])->filter()->implode("\n");

        $prompt = "You are helping a job applicant draft an answer to a job application question.\n"
            ."Use only the background below — do not invent facts. Keep the answer concise (2-4 sentences).\n\n"
            ."Background:\n{$context}\n\n"
            ."Question: {$question}\n\n"
            .'Return only the answer text.';

        $response = OpenAI::chat()->create([
            'model' => self::MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.5,
        ]);

        $answer = trim($response->choices[0]->message->content ?? '');

        if ($answer === '') {
            throw new RuntimeException('Invalid Q&A draft response.');
        }

        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $aiRequest = $user->aiRequests()->create([
            'feature' => 'qa_bank_draft',
            'model' => self::MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'text' => $answer,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'ai_request_id' => $aiRequest->id,
        ];
    }

    private const REVIEW_MODEL = 'gpt-4o';

    /**
     * @param  array<string, mixed>  $resumeData
     * @return array{suggestions: array<int, array<string, mixed>>, prompt_tokens: int, completion_tokens: int}
     */
    public function reviewResume(User $user, array $resumeData, ?string $jd = null): array
    {
        $response = OpenAI::chat()->create([
            'model' => self::REVIEW_MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $this->buildReviewPrompt($resumeData, $jd)],
            ],
            'temperature' => 0.3,
            'response_format' => [
                'type' => 'json_schema',
                'json_schema' => [
                    'name' => 'resume_review',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'suggestions' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'id' => ['type' => 'string'],
                                        'label' => ['type' => 'string'],
                                        'severity' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
                                        'section' => ['type' => 'string', 'enum' => ['contact', 'summary', 'experience', 'skills', 'education']],
                                        'detail' => ['type' => 'string'],
                                    ],
                                    'required' => ['id', 'label', 'severity', 'section', 'detail'],
                                    'additionalProperties' => false,
                                ],
                            ],
                        ],
                        'required' => ['suggestions'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ]);

        $content = $response->choices[0]->message->content ?? '{"suggestions":[]}';
        $decoded = json_decode($content, true);
        $suggestions = is_array($decoded['suggestions'] ?? null) ? $decoded['suggestions'] : [];

        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $user->aiRequests()->create([
            'feature' => 'resume_review',
            'model' => self::REVIEW_MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::REVIEW_MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'suggestions' => $suggestions,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
        ];
    }

    /**
     * @param  array<string, mixed>  $resumeData
     */
    private function buildReviewPrompt(array $resumeData, ?string $jd): string
    {
        $resumeJson = json_encode($resumeData, JSON_PRETTY_PRINT);
        $prompt = 'You are a resume reviewer. Read the resume below and return a '
            .'prioritized list of concrete improvement suggestions. Each suggestion '
            .'needs an id (short slug), a label (one short sentence), a severity '
            .'(high, medium, or low), a section it applies to (contact, summary, '
            .'experience, skills, or education), and a detail (one to two sentences '
            ."explaining why and how to fix it). Be specific, reference actual content \n"
            ."from the resume, and do not invent facts.\n\nResume:\n{$resumeJson}";

        if ($jd !== null && trim($jd) !== '') {
            $prompt .= "\n\nTailor the review against this target job description — "
                ."flag gaps between the resume and what it asks for:\n{$jd}";
        }

        return $prompt;
    }
}
