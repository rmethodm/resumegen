<?php

namespace App\Services;

use App\Models\Resume;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CareerPathService
{
    public function suggest(Resume $resume): array
    {
        $cacheKey = "career_paths_{$resume->id}_{$resume->updated_at->timestamp}";

        return Cache::remember($cacheKey, now()->addDay(), function () use ($resume) {
            return $this->fetchFromAi($resume);
        });
    }

    public function clearCache(Resume $resume): void
    {
        $cacheKey = "career_paths_{$resume->id}_{$resume->updated_at->timestamp}";
        Cache::forget($cacheKey);
    }

    private function fetchFromAi(Resume $resume): array
    {
        $summary = $resume->summary ?? '';
        $titles = collect($resume->experience ?? [])->pluck('title')->filter()->join(', ');
        $skills = collect($resume->skills ?? [])->take(15)->join(', ');

        $prompt = "Analyze this resume and suggest exactly 3 career paths this person could pursue next. Return ONLY a valid JSON array of exactly 3 objects with keys: title (string), match_score (integer 0-100), rationale (string, max 20 words), skills_gap (array of up to 3 strings).\n\nResume summary: <user_content>{$summary}</user_content>\nJob titles: <user_content>{$titles}</user_content>\nSkills: <user_content>{$skills}</user_content>";

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
            throw new \RuntimeException('AI service unavailable');
        }

        $text = $response->json('content.0.text', '[]');

        $paths = json_decode($text, true);
        if (! is_array($paths) || count($paths) !== 3) {
            throw new \RuntimeException('Invalid AI response');
        }

        return $paths;
    }
}
