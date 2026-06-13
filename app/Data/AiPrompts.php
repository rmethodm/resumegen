<?php

namespace App\Data;

use InvalidArgumentException;

class AiPrompts
{
    /**
     * Build the OpenAI prompt for a given feature key.
     *
     * @param  array<string, mixed>  $input
     */
    public static function build(string $feature, array $input): string
    {
        return match ($feature) {
            'rewrite_bullet' => self::rewriteBullet($input),
            'generate_summary' => self::generateSummary($input),
            'ats_keywords' => self::atsKeywords($input),
            default => throw new InvalidArgumentException("Unknown AI feature: {$feature}"),
        };
    }

    /**
     * @param  array{text?: string}  $input
     */
    private static function rewriteBullet(array $input): string
    {
        $text = $input['text'] ?? '';

        return <<<PROMPT
        Rewrite the following resume bullet point(s) to be more impactful. Start each bullet with a
        strong action verb, keep each to a single concise line, quantify impact where the original
        implies it, and do not invent facts. Preserve the number of bullets, one per line. Return
        ONLY the rewritten bullet(s) with no quotes, numbering, or preamble.

        Bullets:
        {$text}
        PROMPT;
    }

    /**
     * @param  array{experience?: array<mixed>, skills?: array<mixed>}  $input
     */
    private static function generateSummary(array $input): string
    {
        $experience = json_encode($input['experience'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $skills = json_encode($input['skills'] ?? [], JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
        Write a professional resume summary (2-3 sentences, first-person implied, no "I").
        Base it strictly on the experience and skills below; do not invent employers or titles.
        Return ONLY the summary paragraph with no heading or preamble.

        Experience: {$experience}
        Skills: {$skills}
        PROMPT;
    }

    /**
     * @param  array{role?: string, experience?: array<mixed>, skills?: array<mixed>}  $input
     */
    private static function atsKeywords(array $input): string
    {
        $role = $input['role'] ?? '';
        $jobDescription = trim($input['job_description'] ?? '');
        $experience = json_encode($input['experience'] ?? [], JSON_UNESCAPED_SLASHES);
        $skills = json_encode($input['skills'] ?? [], JSON_UNESCAPED_SLASHES);

        // When a target job description is provided, gaps are scored against it rather than the generic role.
        $target = $jobDescription !== ''
            ? 'the target job description below'
            : "the target role \"{$role}\"";

        $jobBlock = $jobDescription !== ''
            ? "\n        Target job description: {$jobDescription}\n"
            : '';

        return <<<PROMPT
        You are an ATS keyword analyst. List up to 15 important keywords or skills expected for {$target}
        that appear MISSING from the resume content below. Return ONLY a comma-separated list, no numbering, no commentary.
        {$jobBlock}
        Current skills: {$skills}
        Current experience: {$experience}
        PROMPT;
    }
}
