<?php

namespace App\Support;

use App\Models\QaBankEntry;
use Illuminate\Support\Collection;

/**
 * Fuzzy-matches an incoming application question against a user's saved
 * Q&A bank, using PHP's built-in similar_text percentage on normalized
 * strings — no external dependency for a small, per-user candidate set.
 */
class QaBankMatcher
{
    private const CONFIDENT_THRESHOLD = 60.0;

    /**
     * @return array{match: array{id: int, question: string, answer: string|null}|null, candidates: list<array{id: int, question: string, answer: string|null, score: float}>}
     */
    public static function match(Collection $entries, string $question): array
    {
        $needle = self::normalize($question);

        $scored = $entries
            ->map(function (QaBankEntry $entry) use ($needle) {
                similar_text($needle, self::normalize($entry->question), $percent);

                return [
                    'id' => $entry->id,
                    'question' => $entry->question,
                    'answer' => $entry->answer,
                    'score' => round($percent, 1),
                ];
            })
            ->sortByDesc('score')
            ->values();

        $best = $scored->first();
        $confident = $best !== null && $best['score'] >= self::CONFIDENT_THRESHOLD;

        return [
            'match' => $confident ? $best : null,
            'candidates' => $scored->take(3)->all(),
        ];
    }

    private static function normalize(string $value): string
    {
        return trim(preg_replace('/[^a-z0-9\s]/', '', strtolower($value)) ?? '');
    }
}
