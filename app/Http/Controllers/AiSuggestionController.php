<?php

namespace App\Http\Controllers;

use App\Http\Requests\RewriteBulletRequest;
use App\Models\Resume;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\ResumeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSuggestionController extends Controller
{
    public function rewriteBullet(RewriteBulletRequest $request, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        if (! $limiter->allows($user)) {
            return response()->json(['message' => 'Daily AI limit reached.'], 429);
        }

        $result = $ai->rewriteBullet(
            $user,
            (string) $request->validated('bullet'),
            $request->validated('target_role'),
        );

        return response()->json(['text' => $result['text']]);
    }

    public function reviewResume(Request $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        if (! $limiter->allows($user)) {
            return response()->json(['message' => 'Daily AI limit reached.'], 429);
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
}
