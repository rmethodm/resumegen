<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PersonalTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $token = $request->user()->createToken('Browser Extension');

        return response()->json([
            'id'               => $token->accessToken->id,
            'name'             => $token->accessToken->name,
            'created_at'       => $token->accessToken->created_at->toISOString(),
            'plain_text_token' => $token->plainTextToken,
        ], 201);
    }

    public function destroy(Request $request, int $tokenId): Response
    {
        $request->user()->tokens()->where('id', $tokenId)->delete();

        return response()->noContent();
    }
}
