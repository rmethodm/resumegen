<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AtsScorer;
use Illuminate\Http\JsonResponse;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        return response()->json(AtsScorer::score($resume));
    }
}
