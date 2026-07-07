<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
            'platform' => ['required', 'string', 'in:ios,android'],
        ]);

        $token = DeviceToken::updateOrCreate(
            ['expo_push_token' => $validated['expo_push_token']],
            ['user_id' => $request->user()->id, 'platform' => $validated['platform']],
        );

        return response()->json($token, 201);
    }

    public function destroy(Request $request): Response
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->deviceTokens()
            ->where('expo_push_token', $validated['expo_push_token'])
            ->delete();

        return response()->noContent();
    }
}
