<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Services\AiUsageLogger;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NegotiationScriptController extends Controller
{
    public function store(Request $request, JobApplication $job): JsonResponse
    {
        $this->authorize('update', $job);

        $user = $request->user();

        if (! UserLimits::canNegotiation($user)) {
            return response()->json(['error' => 'Upgrade required', 'required_tier' => 'starter'], 402);
        }

        if (blank($job->role)) {
            return response()->json(['errors' => ['role' => ['Role is required.']]], 422);
        }

        $offeredSalary = $request->input('offered_salary', 'not specified');
        $targetSalary = $request->input('target_salary', 'not specified');

        $prompt = <<<PROMPT
Write a professional salary negotiation email for a candidate who received a job offer for the role of "{$job->role}".
Current offer: {$offeredSalary}
Target: {$targetSalary}
Write a 150-200 word email that is confident, professional, and collaborative in tone.
Return only the email body — no subject line, no placeholders.
PROMPT;

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-3-5-haiku-20241022',
            'max_tokens' => 500,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        $emailBody = $response->json('content.0.text', '');

        AiUsageLogger::log(
            user: $user,
            provider: 'anthropic',
            model: $response->json('model', 'claude-3-5-haiku-20241022'),
            feature: 'negotiation',
            inputTokens: $response->json('usage.input_tokens', 0),
            outputTokens: $response->json('usage.output_tokens', 0),
        );

        return response()->json(['email_body' => trim($emailBody)]);
    }
}
