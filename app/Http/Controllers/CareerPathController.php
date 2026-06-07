<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\CareerPathService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;

class CareerPathController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canCareerPaths(auth()->user())) {
            return response()->json([
                'error' => 'Upgrade required',
                'required_tier' => 'starter',
            ], 402);
        }

        try {
            $paths = app(CareerPathService::class)->suggest($resume);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 503);
        }

        return response()->json(['paths' => $paths]);
    }

    public function destroy(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        app(CareerPathService::class)->clearCache($resume);

        return response()->json(['ok' => true]);
    }
}
