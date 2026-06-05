<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AtsScorer;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canAts(auth()->user())) {
            return response()->json([
                'error' => 'ATS scoring requires a Starter or Pro plan.',
                'required_tier' => 'starter',
            ], 402);
        }

        if ($resume->ats_cache !== null) {
            return response()->json($resume->ats_cache);
        }

        $result = AtsScorer::score($resume);

        $resume->update([
            'ats_cache' => $result,
            'ats_cached_at' => now(),
        ]);

        return response()->json($result);
    }

    public function destroy(Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $resume->update([
            'ats_cache' => null,
            'ats_cached_at' => null,
        ]);

        return response()->noContent();
    }
}
