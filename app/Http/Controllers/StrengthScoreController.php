<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\ResumeStrengthScorer;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StrengthScoreController extends Controller
{
    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canViewStrengthDetail($request->user())) {
            return response()->json([
                'error' => 'Detailed strength scoring is a Starter feature.',
                'required_tier' => 'starter',
            ], 402);
        }

        $result = ResumeStrengthScorer::score($resume);

        return response()->json([
            'score' => $result['score'],
            'tip' => $result['tip'],
            'tipKey' => $result['tipKey'],
            'checklist' => $result['checklist'],
        ]);
    }
}
