<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use OpenAI;

class AiSuggestController extends Controller
{
    public function suggest(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'field' => ['required', 'in:summary,bullets,skills,title'],
            'context' => ['required', 'array'],
            'context.summary' => ['nullable', 'string'],
            'context.title' => ['nullable', 'string'],
            'context.company' => ['nullable', 'string'],
            'context.bullets' => ['nullable', 'string'],
            'context.skills' => ['nullable', 'array'],
            'provider' => ['required', 'in:claude,openai'],
        ]);

        if ($validated['provider'] === 'claude') {
            return $this->suggestWithClaude($validated['field'], $validated['context']);
        }

        return $this->suggestWithOpenAI($validated['field'], $validated['context']);
    }

    private function buildPrompt(string $field, array $context): string
    {
        $contextStr = '';
        if (! empty($context['title'])) {
            $contextStr .= "Job title: {$context['title']}\n";
        }
        if (! empty($context['company'])) {
            $contextStr .= "Company: {$context['company']}\n";
        }
        if (! empty($context['summary'])) {
            $contextStr .= "Current summary: {$context['summary']}\n";
        }
        if (! empty($context['bullets'])) {
            $contextStr .= "Current bullets:\n{$context['bullets']}\n";
        }
        if (! empty($context['skills'])) {
            $contextStr .= 'Current skills: '.implode(', ', $context['skills'])."\n";
        }

        $instructions = match ($field) {
            'summary' => 'Rewrite the professional summary to be more compelling and achievement-focused. Return exactly 3 alternative versions.',
            'bullets' => 'Rewrite each bullet point to start with a strong action verb and include measurable impact where possible. Return exactly 3 alternative full bullet sets, each as a single string with bullets separated by newlines.',
            'skills' => 'Suggest 5 additional relevant skills based on the job title, company, and existing skills. Return exactly 5 short skill names.',
            'title' => 'Suggest 3 alternative job title phrasings that sound more impactful and senior. Return exactly 3 short titles.',
        };

        return "You are a professional resume writer. {$instructions}\n\n{$contextStr}\nRespond with a JSON array of strings only. No markdown, no explanation.";
    }

    private function suggestWithClaude(string $field, array $context): JsonResponse
    {
        $apiKey = config('services.anthropic.key');
        if (! $apiKey) {
            return response()->json(['error' => 'API key not configured'], 422);
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-sonnet-4-6',
            'max_tokens' => 400,
            'messages' => [[
                'role' => 'user',
                'content' => $this->buildPrompt($field, $context),
            ]],
        ]);

        if (! $response->ok()) {
            return response()->json(['error' => 'AI request failed'], 502);
        }

        $text = $response->json('content.0.text', '[]');
        $suggestions = json_decode($text, true) ?? [];

        return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
    }

    private function suggestWithOpenAI(string $field, array $context): JsonResponse
    {
        $apiKey = config('services.openai.key');
        if (! $apiKey) {
            return response()->json(['error' => 'API key not configured'], 422);
        }

        $client = OpenAI::client($apiKey);

        $result = $client->chat()->create([
            'model' => 'gpt-4o',
            'max_tokens' => 400,
            'messages' => [[
                'role' => 'user',
                'content' => $this->buildPrompt($field, $context),
            ]],
        ]);

        $text = $result->choices[0]->message->content ?? '[]';
        $suggestions = json_decode($text, true) ?? [];

        return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
    }
}
