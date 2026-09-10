<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateGapBulletsRequest;
use App\Http\Requests\RewriteBulletRequest;
use App\Http\Requests\RewriteSectionRequest;
use App\Http\Requests\RewriteSummaryRequest;
use App\Models\Experience;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\ResumeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
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

    public function rewriteSummary(RewriteSummaryRequest $request, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();
        $cost = (int) config('ai.costs.summary_rewrite');

        if ($refusal = $this->aiRefusal($limiter, $user, $cost)) {
            return $refusal;
        }

        try {
            $result = $ai->rewriteSummary(
                $user,
                (string) $request->validated('summary'),
                $request->validated('target_role'),
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI rewrite failed.'], 500);
        }

        $credits->spend($user, $cost, 'summary_rewrite', $result['ai_request_id']);

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

    public function rewriteSection(RewriteSectionRequest $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        $cost = (int) config('ai.costs.summary_rewrite');

        if ($refusal = $this->aiRefusal($limiter, $user, $cost)) {
            return $refusal;
        }

        try {
            $result = $ai->rewriteSection(
                $user,
                (string) $request->validated('text'),
                (string) $request->validated('detail'),
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI rewrite failed.'], 500);
        }

        $credits->spend($user, $cost, 'summary_rewrite', $result['ai_request_id']);

        return response()->json(['text' => $result['text']]);
    }

    public function generateGap(GenerateGapBulletsRequest $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        $jd = trim((string) $resume->target_job_description);

        if ($jd === '') {
            throw ValidationException::withMessages([
                'target_job_description' => 'A target job description is required to generate for a gap.',
            ]);
        }

        $cost = (int) config('ai.costs.gap_generate');

        if ($refusal = $this->aiRefusal($limiter, $user, $cost)) {
            return $refusal;
        }

        $experience = $resume->experiences()->findOrFail($request->validated('experience_id'));

        try {
            $result = $ai->generateGapBullets(
                $user,
                (string) $request->validated('keyword'),
                $jd,
                $this->gapRoleContext($experience),
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI generate failed.'], 500);
        }

        $credits->spend($user, $cost, 'gap_generate', $result['ai_request_id']);

        return response()->json([
            'options' => $result['options'],
            'credits_remaining' => $credits->balance($user),
        ]);
    }

    private function gapRoleContext(Experience $experience): string
    {
        $role = trim(collect([$experience->title, $experience->company])->filter()->implode(' at '));
        $bullets = collect($experience->bullets ?? [])
            ->filter(fn ($bullet) => is_string($bullet) && trim($bullet) !== '')
            ->take(8)
            ->map(fn ($bullet) => trim($bullet))
            ->implode("\n");

        return trim($role."\n".$bullets);
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
