<?php

namespace App\Services;

use App\Data\AtsKeywords;
use App\Models\Resume;
use OpenAI;

class AtsScorer
{
    public static function score(Resume $resume): array
    {
        $apiKey = config('services.openai.key');
        $model  = config('services.openai.ats_model', 'gpt-4o-mini');

        if ($apiKey) {
            try {
                $result = self::scoreWithGpt($resume, $apiKey, $model);
                if ($result !== null) {
                    return $result;
                }
            } catch (\Throwable) {
                // fall through to local scorer
            }
        }

        return self::scoreLocally($resume);
    }

    private static function scoreWithGpt(Resume $resume, string $apiKey, string $model): ?array
    {
        $bullets  = implode("\n", self::collectBullets($resume));
        $skills   = implode(', ', self::collectSkills($resume));
        $summary  = $resume->summary ?? '';

        $prompt = <<<PROMPT
You are an ATS (Applicant Tracking System) scoring expert. Score this resume on four axes and return ONLY a valid JSON object — no markdown, no explanation.

Scoring axes (total 100 points):
- action_verbs (max 30 pts): Does the resume use strong action verbs (e.g. achieved, built, led, optimized, delivered, shipped)?
- technical (max 40 pts): Does the resume demonstrate technical skills relevant to the candidate's field?
- soft_skills (max 15 pts): Does the resume mention soft skills (e.g. leadership, communication, collaboration, mentorship)?
- format_signals (max 15 pts): Does the resume have: a summary ≥40 chars (3.75 pts), ≥3 bullet points (3.75 pts), dates in experience (3.75 pts), quantified achievements with numbers/percentages/dollar amounts (3.75 pts)?

For "found": list specific keywords/skills/verbs you detected.
For "missing": list 5–10 impactful keywords/skills that would strengthen this resume for ATS.

Return EXACTLY this JSON shape:
{
  "score": <integer 0-100>,
  "found": {
    "action_verbs": ["verb1", "verb2"],
    "technical": ["skill1", "skill2"],
    "soft_skills": ["skill1"]
  },
  "missing": {
    "action_verbs": ["verb1"],
    "technical": ["skill1"],
    "soft_skills": ["skill1"]
  },
  "breakdown": {
    "action_verbs": <integer 0-30>,
    "technical": <integer 0-40>,
    "soft_skills": <integer 0-15>,
    "format_signals": <integer 0-15>
  }
}

Resume content:
Summary: {$summary}
Skills: {$skills}
Experience bullets:
{$bullets}
PROMPT;

        $client   = OpenAI::client($apiKey);
        $response = $client->chat()->create([
            'model'           => $model,
            'max_tokens'      => 600,
            'response_format' => ['type' => 'json_object'],
            'messages'        => [['role' => 'user', 'content' => $prompt]],
        ]);

        AiUsageLogger::log(
            user: auth()->user(),
            provider: 'openai',
            model: $model,
            feature: 'ats_score',
            inputTokens: $response->usage->promptTokens,
            outputTokens: $response->usage->completionTokens,
        );

        $text   = $response->choices[0]->message->content ?? '';
        $parsed = json_decode($text, true);

        if (! is_array($parsed) || ! isset($parsed['score'], $parsed['found'], $parsed['missing'], $parsed['breakdown'])) {
            return null;
        }

        return $parsed;
    }

    // -------------------------------------------------------------------------
    // Local fallback scorer (used when OpenAI key is absent or call fails)
    // -------------------------------------------------------------------------

    public static function scoreLocally(Resume $resume): array
    {
        $summary  = (string) ($resume->summary ?? '');
        $bullets  = self::collectBullets($resume);
        $skills   = self::collectSkills($resume);

        $bulletText  = strtolower(implode("\n", $bullets));
        $summaryText = strtolower($summary);
        $skillsText  = strtolower(implode(',', $skills));

        $verbSource = $bulletText."\n".$summaryText;
        [$verbsFound, $verbsMissing] = self::matchKeywords(AtsKeywords::ACTION_VERBS, $verbSource);
        $verbScore = self::ratio(count($verbsFound), 12) * 30;

        $techSource = $skillsText."\n".$bulletText;
        [$techFound, $techMissing] = self::matchKeywords(AtsKeywords::TECHNICAL, $techSource);
        $techScore = self::ratio(count($techFound), 8) * 40;

        $softSource = $summaryText."\n".$bulletText;
        [$softFound, $softMissing] = self::matchKeywords(AtsKeywords::SOFT_SKILLS, $softSource);
        $softScore = self::ratio(count($softFound), 4) * 15;

        $hasSummary   = strlen(trim($summary)) >= 40 ? 1 : 0;
        $hasBullets   = count($bullets) >= 3 ? 1 : 0;
        $hasDates     = self::hasDates($resume) ? 1 : 0;
        $hasQuant     = preg_match(AtsKeywords::quantifiedAchievementRegex(), $bulletText.' '.$summaryText) === 1 ? 1 : 0;
        $formatScore  = (($hasSummary + $hasBullets + $hasDates + $hasQuant) / 4) * 15;

        $total = max(0, min(100, (int) round($verbScore + $techScore + $softScore + $formatScore)));

        return [
            'score'   => $total,
            'found'   => ['action_verbs' => $verbsFound,  'technical' => $techFound,  'soft_skills' => $softFound],
            'missing' => ['action_verbs' => array_slice($verbsMissing, 0, 10), 'technical' => array_slice($techMissing, 0, 10), 'soft_skills' => array_slice($softMissing, 0, 10)],
            'breakdown' => [
                'action_verbs'   => (int) round($verbScore),
                'technical'      => (int) round($techScore),
                'soft_skills'    => (int) round($softScore),
                'format_signals' => (int) round($formatScore),
            ],
        ];
    }

    private static function matchKeywords(array $keywords, string $haystack): array
    {
        $found   = [];
        $missing = [];
        foreach ($keywords as $kw) {
            $needle  = strtolower($kw);
            $pattern = '/(?<![a-z0-9])'.preg_quote($needle, '/').'(?![a-z0-9])/i';
            if (preg_match($pattern, $haystack) === 1) {
                $found[] = $kw;
            } else {
                $missing[] = $kw;
            }
        }

        return [$found, $missing];
    }

    private static function ratio(int $found, int $target): float
    {
        return $target <= 0 ? 0.0 : min(1.0, $found / $target);
    }

    private static function collectBullets(Resume $resume): array
    {
        $out = [];
        foreach (($resume->experience ?? []) as $entry) {
            if (! empty($entry['bullets'])) {
                $out[] = is_array($entry['bullets']) ? implode(' ', $entry['bullets']) : (string) $entry['bullets'];
            }
        }

        return $out;
    }

    private static function collectSkills(Resume $resume): array
    {
        return array_values(array_filter((array) ($resume->skills ?? []), fn ($s) => is_string($s) && trim($s) !== ''));
    }

    private static function hasDates(Resume $resume): bool
    {
        foreach (($resume->experience ?? []) as $entry) {
            if (! empty($entry['start_date'])) {
                return true;
            }
        }

        return false;
    }
}
