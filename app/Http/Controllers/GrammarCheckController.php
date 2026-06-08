<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AbuseFilter;
use App\Services\AiUsageLogger;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GrammarCheckController extends Controller
{
    public function check(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canGrammarCheck($request->user())) {
            return response()->json(['error' => 'Upgrade required', 'required_tier' => 'starter'], 402);
        }

        $validated = $request->validate([
            'section' => ['required', 'in:summary,bullets,education,certifications,custom'],
            'text' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        if (AbuseFilter::check($validated['text'])) {
            return response()->json(['error' => 'Content policy violation'], 422);
        }

        $prompt = "You are a professional resume editor. Fix grammar, spelling, and punctuation in the following resume text. Preserve all meaning, keywords, and formatting (including newlines for bullet lists). Return ONLY the corrected text with no explanation.\n\n<user_content>{$validated['text']}</user_content>";

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 1024,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        if (! $response->ok()) {
            return response()->json(['error' => 'AI request failed'], 502);
        }

        AiUsageLogger::log(
            user: $request->user(),
            provider: 'anthropic',
            model: 'claude-haiku-4-5-20251001',
            feature: 'grammar_check',
            inputTokens: $response->json('usage.input_tokens', 0),
            outputTokens: $response->json('usage.output_tokens', 0),
        );

        $corrected = trim($response->json('content.0.text', ''));

        return response()->json(['corrected' => $corrected ?: $validated['text']]);
    }
}
