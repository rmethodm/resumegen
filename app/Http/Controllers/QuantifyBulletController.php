<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AbuseFilter;
use App\Services\AiUsageLogger;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class QuantifyBulletController extends Controller
{
    public function store(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $user = $request->user();

        if (! UserLimits::canQuantifyBullet($user)) {
            return response()->json([
                'error' => 'Monthly limit reached',
                'required_tier' => 'starter',
            ], 402);
        }

        $validated = $request->validate([
            'bullet' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        if (AbuseFilter::check($validated['bullet'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        $prompt = "Rewrite this resume bullet in exactly 3 ways, each adding specific numbers, percentages, dollar amounts, or measurable metrics to make it more impactful. Return ONLY a valid JSON array of exactly 3 strings, nothing else.\n\nBullet: <user_content>{$validated['bullet']}</user_content>";

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 512,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (! $response->successful()) {
            return response()->json(['error' => 'AI service unavailable'], 503);
        }

        $body = $response->json();
        $text = $body['content'][0]['text'] ?? '[]';

        try {
            $suggestions = json_decode($text, true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($suggestions) || count($suggestions) !== 3) {
                throw new \InvalidArgumentException('Expected 3 suggestions');
            }
        } catch (\Throwable) {
            return response()->json(['error' => 'Invalid AI response format'], 422);
        }

        AiUsageLogger::log(
            user: $user,
            provider: 'anthropic',
            model: 'claude-haiku-4-5-20251001',
            feature: 'quantify_bullet',
            inputTokens: $body['usage']['input_tokens'] ?? 0,
            outputTokens: $body['usage']['output_tokens'] ?? 0,
        );

        return response()->json(['suggestions' => $suggestions]);
    }
}
