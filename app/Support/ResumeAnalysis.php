<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\Resume;

/**
 * The "AI" behind the match score: a deterministic scorer and bullet critic.
 * Scores a resume against itself — completeness, quantified bullets,
 * keywords for its own target role — and knows nothing about any job posting.
 *
 * ponytail: hand-written rules, no model call. Every number here is
 * explainable and testable, which a model's is not. Swap the two public
 * methods for a real completion if the advice stops being convincing —
 * nothing outside this class knows how the score was produced.
 *
 * @phpstan-type Suggestion array{experience: int|null, bullet: int|null, message: string, rewrite: string|null}
 */
final class ResumeAnalysis
{
    /**
     * Signal keywords per role family, matched as substrings of the lowercased
     * target role. First family that matches wins; no match scores neutral.
     *
     * @var array<string, list<string>>
     */
    private const ROLE_KEYWORDS = [
        'design' => ['figma', 'prototyping', 'design system', 'user research', 'accessibility', 'usability'],
        'engineer' => ['typescript', 'react', 'api', 'testing', 'ci/cd', 'performance'],
        'data' => ['sql', 'python', 'dashboard', 'experimentation', 'modeling', 'etl'],
        'product' => ['roadmap', 'discovery', 'stakeholder', 'metrics', 'a/b testing', 'strategy'],
        'market' => ['campaign', 'seo', 'lifecycle', 'positioning', 'content', 'analytics'],
    ];

    /**
     * Openings that bury the candidate's own contribution, and the verb that
     * replaces them. The replacement is a real edit, not a placeholder — it is
     * what makes "Insert rewrite" in the editor honest.
     *
     * @var array<string, string>
     */
    private const WEAK_OPENINGS = [
        'helped with' => 'Drove',
        'helped to' => 'Drove',
        'worked on' => 'Delivered',
        'responsible for' => 'Owned',
        'assisted with' => 'Led',
        'participated in' => 'Drove',
        'involved in' => 'Led',
        'was part of' => 'Led',
    ];

    private const MAX_SUGGESTIONS = 6;

    /**
     * Match score out of 100. Four equally-sized bands so a resume that is
     * strong in one dimension can't hide a gap in another.
     */
    public static function score(Resume $resume): int
    {
        return array_sum(array_column(self::breakdown($resume), 'score'));
    }

    /**
     * The four bands behind {@see self::score()}, exposed separately so the
     * UI can show *why* one resume scores higher than another instead of
     * just the single number.
     *
     * @return list<array{label: string, score: int}>
     */
    public static function breakdown(Resume $resume): array
    {
        return [
            ['label' => 'Profile', 'score' => (int) round(self::profileScore($resume))],
            ['label' => 'Experience', 'score' => (int) round(self::experienceScore($resume))],
            ['label' => 'Impact', 'score' => (int) round(self::impactScore($resume))],
            ['label' => 'Keywords', 'score' => (int) round(self::keywordScore($resume) * 25)],
        ];
    }

    /**
     * Ranked advice, most actionable first: fixable bullets before gaps.
     *
     * @return list<Suggestion>
     */
    public static function suggestions(Resume $resume): array
    {
        $rewrites = [];
        $quantify = [];

        foreach ($resume->experiences as $experienceIndex => $experience) {
            foreach ($experience->bullets ?? [] as $bulletIndex => $bullet) {
                if ($rewrite = self::rewrite($bullet)) {
                    $rewrites[] = [
                        'experience' => $experienceIndex,
                        'bullet' => $bulletIndex,
                        'message' => 'Lead with the action you took, not your proximity to it.',
                        'rewrite' => $rewrite,
                    ];
                } elseif (! self::isQuantified($bullet)) {
                    $quantify[] = [
                        'experience' => $experienceIndex,
                        'bullet' => $bulletIndex,
                        'message' => 'Quantify impact: add a number, percentage, or scale to this bullet.',
                        'rewrite' => null,
                    ];
                }
            }
        }

        return array_slice(
            [...$rewrites, ...$quantify, ...self::gaps($resume)],
            0,
            self::MAX_SUGGESTIONS,
        );
    }

    /**
     * The keywords for a resume's target role, so the UI can show what it is
     * being measured against instead of an unexplained number.
     *
     * @return list<string>
     */
    public static function keywordsFor(string $targetRole): array
    {
        $targetRole = mb_strtolower($targetRole);

        foreach (self::ROLE_KEYWORDS as $family => $keywords) {
            if (str_contains($targetRole, $family)) {
                return $keywords;
            }
        }

        return [];
    }

    /** Contact and summary completeness, 25 points. */
    private static function profileScore(Resume $resume): float
    {
        $filled = count(array_filter([
            $resume->full_name !== '',
            $resume->headline !== '',
            $resume->email !== '',
            $resume->location !== '',
            mb_strlen($resume->summary) >= 80,
        ]));

        return $filled / 5 * 25;
    }

    /** Enough history to be readable, 25 points. */
    private static function experienceScore(Resume $resume): float
    {
        $described = $resume->experiences->filter(
            fn (Experience $experience): bool => $experience->title !== '' && $experience->company !== ''
        )->count();

        $bullets = self::bullets($resume);

        // Two described roles and six bullets between them reads as a complete
        // resume; more than that doesn't score higher.
        return min($described / 2, 1) * 12.5 + min(count($bullets) / 6, 1) * 12.5;
    }

    /** Share of bullets carrying a number, 25 points. */
    private static function impactScore(Resume $resume): float
    {
        $bullets = self::bullets($resume);

        if ($bullets === []) {
            return 0;
        }

        $quantified = count(array_filter($bullets, self::isQuantified(...)));

        return $quantified / count($bullets) * 25;
    }

    /** Share of the target role's keywords present anywhere, 0-1. */
    private static function keywordScore(Resume $resume): float
    {
        $keywords = self::keywordsFor($resume->target_role);

        if ($keywords === []) {
            // No target role set, or one we have no keywords for. Scoring this
            // band zero would punish the user for a field they never filled.
            return 0.6;
        }

        return 1 - count(self::missingKeywords($resume)) / count($keywords);
    }

    /**
     * @return list<string>
     */
    private static function missingKeywords(Resume $resume): array
    {
        $haystack = mb_strtolower(implode(' ', [
            $resume->headline,
            $resume->summary,
            implode(' ', self::bullets($resume)),
            $resume->skills->pluck('name')->implode(' '),
        ]));

        return array_values(array_filter(
            self::keywordsFor($resume->target_role),
            fn (string $keyword): bool => ! str_contains($haystack, $keyword),
        ));
    }

    /**
     * Structural gaps, appended after the per-bullet advice.
     *
     * @return list<Suggestion>
     */
    private static function gaps(Resume $resume): array
    {
        $gaps = [];

        if (mb_strlen($resume->summary) < 80) {
            $gaps[] = [
                'experience' => null,
                'bullet' => null,
                'message' => 'Write a two-sentence summary — it is the first thing a recruiter reads.',
                'rewrite' => null,
            ];
        }

        if ($resume->skills->count() < 5) {
            $gaps[] = [
                'experience' => null,
                'bullet' => null,
                'message' => 'List at least five skills so keyword filters can find you.',
                'rewrite' => null,
            ];
        }

        $missing = self::missingKeywords($resume);

        if ($missing !== []) {
            $gaps[] = [
                'experience' => null,
                'bullet' => null,
                'message' => 'Missing for this role: '.implode(', ', array_slice($missing, 0, 3)).'.',
                'rewrite' => null,
            ];
        }

        return $gaps;
    }

    /**
     * @return list<string>
     */
    private static function bullets(Resume $resume): array
    {
        return array_values($resume->experiences
            ->flatMap(fn (Experience $experience): array => $experience->bullets ?? [])
            ->all());
    }

    private static function isQuantified(string $bullet): bool
    {
        return preg_match('/\d/', $bullet) === 1;
    }

    /**
     * Rebuild a bullet that opens with a weak phrase, preserving the rest of
     * the sentence verbatim.
     */
    private static function rewrite(string $bullet): ?string
    {
        $trimmed = ltrim($bullet);

        foreach (self::WEAK_OPENINGS as $opening => $verb) {
            if (str_starts_with(mb_strtolower($trimmed), $opening)) {
                return $verb.mb_substr($trimmed, mb_strlen($opening));
            }
        }

        return null;
    }
}
