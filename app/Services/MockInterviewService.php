<?php

namespace App\Services;

use App\Models\Resume;
use Illuminate\Support\Facades\Http;

class MockInterviewService
{
    public function chat(Resume $resume, string $targetRole, array $history, ?string $userMessage): array
    {
        $summary = $resume->summary ?? 'No summary provided.';

        $systemPrompt = "You are an expert interviewer. The candidate is applying for: {$targetRole}. "
            ."Their resume summary: {$summary}. "
            .'Conduct a realistic interview: ask one STAR-based behavioral or technical question at a time. '
            .'After the candidate answers, give 1-2 sentences of constructive feedback, then ask the next question. '
            ."After 5 complete Q&A rounds, say exactly 'Interview complete.' and give an overall 2-3 sentence assessment.";

        $messages = $history;
        if ($userMessage) {
            $messages[] = ['role' => 'user', 'content' => "<user_content>{$userMessage}</user_content>"];
        }
        if (empty($messages)) {
            $messages[] = ['role' => 'user', 'content' => 'Please begin the interview.'];
        }

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 512,
            'system' => $systemPrompt,
            'messages' => $messages,
        ]);

        $content = $response->json('content.0.text', '');
        $done = str_contains($content, 'Interview complete');

        return ['message' => $content, 'done' => $done];
    }
}
