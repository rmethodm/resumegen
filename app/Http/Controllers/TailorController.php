<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AiUsageLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TailorController extends Controller
{
    public function tailor(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'job_description' => ['required', 'string', 'min:50', 'max:5000'],
        ]);

        $jd = $validated['job_description'];

        $resumeText = $this->buildResumeText($resume);

        $prompt = <<<EOT
You are a professional resume writer. Analyze this job description and resume, then return a JSON object with exactly these keys:
- "summary": A rewritten professional summary (2-3 sentences) tailored to match the job description keywords and requirements
- "keywords": An array of up to 8 skill keywords from the job description that are NOT already in the resume's skills section (max 8 strings)
- "score": An integer from 0-100 representing how well the current resume matches the job description

Job Description:
{$jd}

Current Resume:
{$resumeText}

Return ONLY valid JSON with keys "summary", "keywords", "score". No markdown, no explanation.
EOT;

        $model = config('services.anthropic.model', 'claude-opus-4-8');
        $provider = 'anthropic';
        $inputTokens = 0;
        $outputTokens = 0;
        $result = null;

        if (config('services.anthropic.key')) {
            $response = Http::withHeaders([
                'x-api-key'         => config('services.anthropic.key'),
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model,
                'max_tokens' => 500,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $inputTokens  = $data['usage']['input_tokens'] ?? 0;
                $outputTokens = $data['usage']['output_tokens'] ?? 0;
                $result = json_decode($data['content'][0]['text'] ?? '{}', true);
            }
        } elseif (config('services.openai.key')) {
            $provider = 'openai';
            $model = config('services.openai.suggest_model', 'gpt-4o-mini');
            $response = Http::withToken(config('services.openai.key'))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model'      => $model,
                    'messages'   => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 500,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $inputTokens  = $data['usage']['prompt_tokens'] ?? 0;
                $outputTokens = $data['usage']['completion_tokens'] ?? 0;
                $result = json_decode($data['choices'][0]['message']['content'] ?? '{}', true);
            }
        }

        if (! $result || ! isset($result['summary'], $result['keywords'], $result['score'])) {
            return response()->json(['error' => 'AI service unavailable'], 503);
        }

        AiUsageLogger::log(
            user: $request->user(),
            provider: $provider,
            model: $model,
            feature: 'tailor',
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
        );

        return response()->json([
            'summary'  => (string) ($result['summary'] ?? ''),
            'keywords' => array_values(array_slice((array) ($result['keywords'] ?? []), 0, 8)),
            'score'    => max(0, min(100, (int) ($result['score'] ?? 0))),
        ]);
    }

    private function buildResumeText(Resume $resume): string
    {
        $parts = [];

        $contact = $resume->contact ?? [];
        if (! empty($contact['full_name'])) {
            $parts[] = 'Name: ' . $contact['full_name'];
        }

        if (! empty($resume->summary)) {
            $parts[] = 'Summary: ' . $resume->summary;
        }

        $skills = $resume->skills ?? [];
        if ($skills) {
            $parts[] = 'Skills: ' . implode(', ', $skills);
        }

        foreach (($resume->experience ?? []) as $exp) {
            if (empty($exp['company']) && empty($exp['title'])) {
                continue;
            }
            $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
            if (! empty($exp['bullets'])) {
                $line .= "\n" . $exp['bullets'];
            }
            $parts[] = $line;
        }

        return implode("\n\n", $parts);
    }
}
