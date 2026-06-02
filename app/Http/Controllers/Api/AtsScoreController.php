<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\AtsScorer;
use Illuminate\Http\JsonResponse;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if ($resume->ats_cache !== null) {
            return response()->json($resume->ats_cache);
        }

        $result = AtsScorer::score($resume);

        $resume->update([
            'ats_cache'     => $result,
            'ats_cached_at' => now(),
        ]);

        return response()->json($result);
    }
}
