<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AbuseFilter;
use App\Services\MockInterviewService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MockInterviewController extends Controller
{
    public function __construct(private readonly MockInterviewService $service) {}

    public function chat(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        UserLimits::requirePro($request->user());

        $validated = $request->validate([
            'target_role' => ['required', 'string', 'max:100'],
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.role' => ['required', 'in:user,assistant'],
            'history.*.content' => ['required', 'string', 'max:2000'],
            'user_message' => ['nullable', 'string', 'max:2000'],
        ]);

        if (AbuseFilter::check($validated['target_role'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        if (! empty($validated['user_message']) && AbuseFilter::check($validated['user_message'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        $result = $this->service->chat(
            $resume,
            $validated['target_role'],
            $validated['history'] ?? [],
            $validated['user_message'] ?? null,
        );

        return response()->json($result);
    }
}
