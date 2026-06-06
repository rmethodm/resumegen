<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AbuseFilter;
use App\Services\InterviewCoachService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterviewCoachController extends Controller
{
    public function coach(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $user = $request->user();

        if (! UserLimits::canInterviewCoach($user)) {
            return response()->json([
                'error' => 'You have used your 3 free interview coach sessions this month. Upgrade to Starter for unlimited access.',
                'required_tier' => 'starter',
            ], 402);
        }

        $validated = $request->validate([
            'target_role' => ['required', 'string', 'max:100'],
            'job_description' => ['nullable', 'string', 'max:3000'],
        ]);

        if (AbuseFilter::check($validated['target_role'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        if (! empty($validated['job_description']) && AbuseFilter::check($validated['job_description'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        try {
            $questions = (new InterviewCoachService)->generate(
                $resume,
                $validated['target_role'],
                $validated['job_description'] ?? null,
                $user,
            );
        } catch (\RuntimeException) {
            return response()->json(['message' => 'AI service unavailable'], 503);
        }

        return response()->json(['questions' => $questions]);
    }
}
