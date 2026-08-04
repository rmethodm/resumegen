<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AiUsageLimiter;
use App\Services\OpenAiResumeAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ResumeAiController extends Controller
{
    public function __construct(
        private OpenAiResumeAssistant $assistant,
        private AiUsageLimiter $limiter,
    ) {}

    public function rewriteBullet(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        if (! $this->assistant->enabled()) {
            return response()->json([
                'message' => 'AI is not enabled. Set AI_ENABLED=true and OPENAI_API_KEY in the environment.',
            ], 503);
        }

        $data = $request->validate([
            'bullet' => ['required', 'string', 'max:1000'],
            'target_role' => ['nullable', 'string', 'max:255'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);

        $user = $request->user();
        if (! $this->limiter->allow($user, 'bullet_rewrite')) {
            return response()->json([
                'message' => 'Monthly free rewrite limit reached ('.(int) config('ai.quotas.bullet_rewrite').').',
                'remaining' => 0,
            ], 429);
        }

        try {
            $options = $this->assistant->rewriteBullet(
                $data['bullet'],
                (string) ($data['target_role'] ?? $resume->target_role ?? ''),
                (string) ($data['job_description'] ?? $resume->target_job_description ?? ''),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        $this->limiter->hit($user, 'bullet_rewrite');

        return response()->json([
            'options' => $options,
            'remaining' => $this->limiter->remaining($user, 'bullet_rewrite'),
        ]);
    }

    public function generateSummary(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        if (! $this->assistant->enabled()) {
            return response()->json([
                'message' => 'AI is not enabled. Set AI_ENABLED=true and OPENAI_API_KEY in the environment.',
            ], 503);
        }

        $data = $request->validate([
            'target_role' => ['nullable', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'job_description' => ['nullable', 'string', 'max:10000'],
            'experience_context' => ['nullable', 'string', 'max:4000'],
        ]);

        $user = $request->user();
        if (! $this->limiter->allow($user, 'summary')) {
            return response()->json([
                'message' => 'Monthly free summary limit reached ('.(int) config('ai.quotas.summary').').',
                'remaining' => 0,
            ], 429);
        }

        $experienceContext = (string) ($data['experience_context'] ?? '');
        if ($experienceContext === '') {
            $resume->loadMissing('experiences');
            $parts = [];
            foreach ($resume->experiences as $experience) {
                $parts[] = trim(($experience->title ?? '').' @ '.($experience->company ?? ''));
                foreach ($experience->bullets ?? [] as $bullet) {
                    if (is_string($bullet) && trim($bullet) !== '') {
                        $parts[] = '- '.$bullet;
                    }
                }
            }
            $experienceContext = implode("\n", $parts);
        }

        try {
            $summary = $this->assistant->generateSummary(
                (string) ($data['target_role'] ?? $resume->target_role ?? ''),
                (string) ($data['headline'] ?? $resume->headline ?? ''),
                (string) ($data['summary'] ?? $resume->summary ?? ''),
                $experienceContext,
                (string) ($data['job_description'] ?? $resume->target_job_description ?? ''),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        $this->limiter->hit($user, 'summary');

        return response()->json([
            'summary' => $summary,
            'remaining' => $this->limiter->remaining($user, 'summary'),
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'enabled' => $this->assistant->enabled(),
            'quotas' => [
                'bullet_rewrite' => [
                    'cap' => $this->limiter->cap('bullet_rewrite'),
                    'remaining' => $this->limiter->remaining($user, 'bullet_rewrite'),
                ],
                'summary' => [
                    'cap' => $this->limiter->cap('summary'),
                    'remaining' => $this->limiter->remaining($user, 'summary'),
                ],
            ],
        ]);
    }
}
