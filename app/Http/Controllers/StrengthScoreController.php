<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeStrengthSnapshot;
use App\Services\ResumeStrengthScorer;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StrengthScoreController extends Controller
{
    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $result = ResumeStrengthScorer::score($resume);

        $last = ResumeStrengthSnapshot::where('resume_id', $resume->id)
            ->orderByDesc('created_at')
            ->first();

        if (! $last || abs($last->score - $result['score']) >= 5) {
            ResumeStrengthSnapshot::create([
                'resume_id' => $resume->id,
                'score' => $result['score'],
                'checklist' => $result['checklist'],
            ]);
        }

        $user = $request->user();
        $history = null;

        if (UserLimits::canStrengthHistory($user)) {
            $history = ResumeStrengthSnapshot::where('resume_id', $resume->id)
                ->orderBy('created_at')
                ->limit(30)
                ->get(['score', 'created_at'])
                ->map(fn ($s) => ['score' => $s->score, 'date' => $s->created_at->toDateString()])
                ->values()
                ->all();
        }

        return response()->json([
            'score' => $result['score'],
            'checklist' => $result['checklist'],
            'history' => $history,
        ]);
    }
}
