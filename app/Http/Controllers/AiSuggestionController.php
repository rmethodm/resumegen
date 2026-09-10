<?php

namespace App\Http\Controllers;

use App\Http\Requests\RewriteBulletRequest;
use App\Http\Requests\RewriteSectionRequest;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\ResumeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiSuggestionController extends Controller
{
    public function rewriteBullet(RewriteBulletRequest $request, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();
        $cost = (int) config('ai.costs.bullet_rewrite');

        if ($refusal = $this->aiRefusal($limiter, $user, $cost)) {
            return $refusal;
        }

        try {
            $result = $ai->rewriteBullet(
                $user,
                (string) $request->validated('bullet'),
                $request->validated('target_role'),
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI rewrite failed.'], 500);
        }

        $credits->spend($user, $cost, 'bullet_rewrite', $result['ai_request_id']);

        return response()->json([
            'options' => $result['options'],
            'credits_remaining' => $credits->balance($user),
        ]);
    }

    public function reviewResume(Request $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        if ($refusal = $this->aiRefusal($limiter, $user, 1)) {
            return $refusal;
        }

        $jd = $resume->target_job_description;
        $result = $ai->reviewResume($user, ResumeDocument::toArray($resume), $jd !== '' ? $jd : null);

        $resume->ai_review = $result['suggestions'];
        $resume->ai_review_generated_at = now();
        $resume->save();

        return response()->json([
            'suggestions' => $resume->ai_review,
            'generated_at' => $resume->ai_review_generated_at->toIso8601String(),
        ]);
    }

    public function rewriteSection(RewriteSectionRequest $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        $cost = (int) config('ai.costs.summary_rewrite');

        if ($refusal = $this->aiRefusal($limiter, $user, $cost)) {
            return $refusal;
        }

        $result = $ai->rewriteSection(
            $user,
            (string) $request->validated('text'),
            (string) $request->validated('detail'),
        );

        return response()->json(['text' => $result['text']]);
    }

    private function aiRefusal(AiUsageLimiter $limiter, User $user, int $cost): ?JsonResponse
    {
        $status = $limiter->refusalStatus($user, $cost);

        if ($status === null) {
            return null;
        }

        $message = $status === 429
            ? 'AI access is blocked.'
            : 'Subscription or AI credits required.';

        return response()->json(['message' => $message], $status);
    }
}
