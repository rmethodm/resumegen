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
 * @phpstan-type Suggestion array{experience: int|null, bullet: int|null, message: string, rewrite: string|null, category: string|null, verbs: list<string>}
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
     * Openings that bury the candidate's own contribution, grouped by why
     * they're weak. Each phrase carries the verbs a human might replace it
     * with (shown as inspiration, never guessed at automatically) and a
     * coaching message asking for the specific action instead.
     *
     * `verb` is set only when swapping it in for the phrase is grammatically
     * safe AND doesn't add a claim (leadership, ownership, results) the rest
     * of the bullet doesn't already support — see `weakOpening()`. Most phrases
     * here are followed by too many different constructions (gerunds, role
     * names, unstated objects) for a blind single-verb swap to stay honest,
     * so they're coaching-only.
     *
     * @var array<string, array{category: string, verbs: list<string>, coaching: string, verb: string|null}>
     */
    private const WEAK_OPENINGS = [
        // Responsibility phrases: naming a duty without saying what was done with it.
        'responsible for' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name what you actually managed or decided, not just that you were responsible for it.', 'verb' => 'Managed'],
        'was responsible for' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name what you actually managed or decided, not just that you were responsible for it.', 'verb' => 'Managed'],
        'duties included' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'List the duty as an action you took, not as something that was "included."', 'verb' => null],
        'tasked with' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name the action you were tasked with, not just that you were assigned it.', 'verb' => null],
        'in charge of' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name what being "in charge" meant you actually did.', 'verb' => null],
        'charged with' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name the action you were charged with, not just that you were assigned it.', 'verb' => null],
        'assigned to' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'Name what the assignment actually had you do.', 'verb' => null],
        'served as' => ['category' => 'responsibility', 'verbs' => ['Managed', 'Owned', 'Administered', 'Coordinated', 'Oversaw'], 'coaching' => 'A role title alone doesn\'t say what you did in it — name the action.', 'verb' => null],

        // Passive participation: present, but the bullet doesn't say what part they played.
        'participated in' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what you actually did as part of it, not just that you participated.', 'verb' => null],
        'took part in' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what you actually did as part of it, not just that you took part.', 'verb' => null],
        'was involved in' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what your involvement actually was.', 'verb' => null],
        'involved in' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what your involvement actually was.', 'verb' => null],
        'was part of' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what you contributed to it, not just that you were part of it.', 'verb' => null],
        'joined a team that' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Say what you contributed on the team, not just that you joined it.', 'verb' => null],
        'contributed to' => ['category' => 'passive participation', 'verbs' => ['Streamlined', 'Organized', 'Standardized', 'Improved'], 'coaching' => 'Name the specific contribution you made.', 'verb' => null],

        // Vague assistance: real effort, but no stated action — never auto-upgraded to a leadership verb.
        'helped with' => ['category' => 'vague assistance', 'verbs' => ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'], 'coaching' => 'Name the specific action you took to help, not just that you helped.', 'verb' => null],
        'helped to' => ['category' => 'vague assistance', 'verbs' => ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'], 'coaching' => 'Name the specific action you took to help, not just that you helped.', 'verb' => null],
        'assisted with' => ['category' => 'vague assistance', 'verbs' => ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'], 'coaching' => 'Name the specific action you took, not just that you assisted.', 'verb' => null],
        'aided in' => ['category' => 'vague assistance', 'verbs' => ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'], 'coaching' => 'Name the specific action you took, not just that you aided.', 'verb' => null],
        'provided assistance with' => ['category' => 'vague assistance', 'verbs' => ['Processed', 'Resolved', 'Prepared', 'Maintained', 'Supported'], 'coaching' => 'Name the specific action you took, not just that you assisted.', 'verb' => null],

        // Generic work phrases: a task happened, but not what it was.
        'worked on' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name what you actually did to it — built, fixed, configured, tested?', 'verb' => null],
        'worked with' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name what you actually did with it.', 'verb' => null],
        'dealt with' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name the specific action you took.', 'verb' => null],
        'handled' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name the specific action you took.', 'verb' => null],
        'took care of' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name the specific action you took.', 'verb' => null],
        'did' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name the specific action, not just that you did it.', 'verb' => null],
        'performed' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name the specific action behind "performed."', 'verb' => null],
        'utilized' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name what you did with it, not just that you used it.', 'verb' => null],
        'used' => ['category' => 'generic work', 'verbs' => ['Configured', 'Implemented', 'Troubleshot', 'Automated', 'Repaired'], 'coaching' => 'Name what you did with it, not just that you used it.', 'verb' => null],
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
                if ($weakOpening = self::weakOpening($bullet)) {
                    $rewrites[] = [
                        'experience' => $experienceIndex,
                        'bullet' => $bulletIndex,
                        'message' => $weakOpening['rewrite'] !== null
                            ? 'Lead with the action you took, not your proximity to it.'
                            : $weakOpening['coaching'],
                        'rewrite' => $weakOpening['rewrite'],
                        'category' => $weakOpening['category'],
                        'verbs' => $weakOpening['verbs'],
                    ];
                } elseif (! self::isQuantified($bullet)) {
                    $quantify[] = [
                        'experience' => $experienceIndex,
                        'bullet' => $bulletIndex,
                        'message' => 'Quantify impact: add a number, percentage, or scale to this bullet.',
                        'rewrite' => null,
                        'category' => null,
                        'verbs' => [],
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
                'category' => null,
                'verbs' => [],
            ];
        }

        if ($resume->skills->count() < 5) {
            $gaps[] = [
                'experience' => null,
                'bullet' => null,
                'message' => 'List at least five skills so keyword filters can find you.',
                'rewrite' => null,
                'category' => null,
                'verbs' => [],
            ];
        }

        $missing = self::missingKeywords($resume);

        if ($missing !== []) {
            $gaps[] = [
                'experience' => null,
                'bullet' => null,
                'message' => 'Missing for this role: '.implode(', ', array_slice($missing, 0, 3)).'.',
                'rewrite' => null,
                'category' => null,
                'verbs' => [],
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
     * Match a bullet that *opens* with a weak phrase (mid-sentence use is
     * left alone — "...and participated in the rollout" is fine). Matching
     * is by whole phrase with a word boundary after it, so "did" doesn't
     * fire on "Didn't" and "used" doesn't fire on "user-tested".
     *
     * @return array{category: string, verbs: list<string>, coaching: string, rewrite: string|null}|null
     */
    private static function weakOpening(string $bullet): ?array
    {
        $trimmed = ltrim($bullet, " \t\n\r\0\x0B-–—•*\"'“”‘’");

        foreach (self::WEAK_OPENINGS as $phrase => $definition) {
            if (preg_match('/^'.preg_quote($phrase, '/').'\b/iu', $trimmed) !== 1) {
                continue;
            }

            $remainder = mb_substr($trimmed, mb_strlen($phrase));

            return [
                'category' => $definition['category'],
                'verbs' => $definition['verbs'],
                'coaching' => $definition['coaching'],
                'rewrite' => $definition['verb'] !== null && ! self::startsWithGerund($remainder)
                    ? $definition['verb'].$remainder
                    : null,
            ];
        }

        return null;
    }

    /**
     * True when the text right after a matched phrase opens with an "-ing"
     * word — "responsible for *managing* tickets" — where prefixing a verb
     * would double up ("Managed managing tickets"). Phrases followed by a
     * gerund get a coaching suggestion instead of a rewrite.
     */
    private static function startsWithGerund(string $remainder): bool
    {
        return preg_match('/^\s+\w+ing\b/iu', $remainder) === 1;
    }
}
