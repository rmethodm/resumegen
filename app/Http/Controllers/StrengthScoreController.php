<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\ResumeStrengthScorer;
use Illuminate\Http\JsonResponse;

class StrengthScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $result = ResumeStrengthScorer::score($resume);

        return response()->json([
            'score' => $result['score'],
            'tip' => $result['tip'],
            'tipKey' => $result['tipKey'],
            'checklist' => $result['checklist'],
        ]);
    }
}
