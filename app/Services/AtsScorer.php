<?php

namespace App\Services;

use App\Data\AtsKeywords;
use App\Models\Resume;

class AtsScorer
{
    public static function score(Resume $resume): array
    {
        $summary = (string) ($resume->summary ?? '');
        $bullets = self::collectBullets($resume);
        $skills = self::collectSkills($resume);

        $bulletText = strtolower(implode("\n", $bullets));
        $summaryText = strtolower($summary);
        $skillsText = strtolower(implode(',', $skills));

        $verbSource = $bulletText."\n".$summaryText;
        [$verbsFound, $verbsMissing] = self::matchKeywords(AtsKeywords::ACTION_VERBS, $verbSource);
        $verbScore = self::ratio(count($verbsFound), 12) * 30;

        $techSource = $skillsText."\n".$bulletText;
        [$techFound, $techMissing] = self::matchKeywords(AtsKeywords::TECHNICAL, $techSource);
        $techScore = self::ratio(count($techFound), 8) * 40;

        $softSource = $summaryText."\n".$bulletText;
        [$softFound, $softMissing] = self::matchKeywords(AtsKeywords::SOFT_SKILLS, $softSource);
        $softScore = self::ratio(count($softFound), 4) * 15;

        $hasSummary = strlen(trim($summary)) >= 40 ? 1 : 0;
        $hasBullets = count($bullets) >= 3 ? 1 : 0;
        $hasDates = self::hasDates($resume) ? 1 : 0;
        $hasQuant = preg_match(AtsKeywords::quantifiedAchievementRegex(), $bulletText.' '.$summaryText) === 1 ? 1 : 0;
        $formatScore = (($hasSummary + $hasBullets + $hasDates + $hasQuant) / 4) * 15;

        $total = max(0, min(100, (int) round($verbScore + $techScore + $softScore + $formatScore)));

        return [
            'score' => $total,
            'found' => [
                'action_verbs' => $verbsFound,
                'technical' => $techFound,
                'soft_skills' => $softFound,
            ],
            'missing' => [
                'action_verbs' => array_slice($verbsMissing, 0, 10),
                'technical' => array_slice($techMissing, 0, 10),
                'soft_skills' => array_slice($softMissing, 0, 10),
            ],
            'breakdown' => [
                'action_verbs' => (int) round($verbScore),
                'technical' => (int) round($techScore),
                'soft_skills' => (int) round($softScore),
                'format_signals' => (int) round($formatScore),
            ],
        ];
    }

    private static function matchKeywords(array $keywords, string $haystack): array
    {
        $found = [];
        $missing = [];
        foreach ($keywords as $kw) {
            $needle = strtolower($kw);
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
        if ($target <= 0) {
            return 0.0;
        }

        return min(1.0, $found / $target);
    }

    private static function collectBullets(Resume $resume): array
    {
        $out = [];
        foreach (($resume->experience ?? []) as $entry) {
            if (! empty($entry['bullets'])) {
                $out[] = (string) $entry['bullets'];
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
