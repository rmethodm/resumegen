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
            'critique_bullet' => self::critiqueBullet($input),
            'generate_summary' => self::generateSummary($input),
            'ats_keywords' => self::atsKeywords($input),
            'interview_coach' => self::interviewCoach($input),
            'career_coach' => self::careerCoach($input),
            'cover_letter' => self::coverLetter($input),
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
     * @param  array{text?: string}  $input
     */
    private static function critiqueBullet(array $input): string
    {
        $text = $input['text'] ?? '';

        return <<<PROMPT
        You are a resume coach. Do NOT rewrite the bullet below and do NOT write any replacement
        text — the candidate must write it themselves, in their own words, using facts only they know.

        Identify what a recruiter would need to know that this bullet fails to say: missing numbers,
        missing scale, missing outcome, missing timeframe. Ask at most 3 short, specific questions
        that would force those facts out of the candidate. Ask only about things the bullet actually
        leaves unanswered. If the bullet is already specific and quantified, return nothing at all.

        Return ONLY the questions, one per line, with no numbering, preamble, or commentary.

        Bullet:
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
     * @param  array{target_role?: string, job_description?: string, experience?: array<mixed>, skills?: array<mixed>, name?: string}  $input
     */
    private static function interviewCoach(array $input): string
    {
        $targetRole = $input['target_role'] ?? 'the target role';
        $name = $input['name'] ?? 'Candidate';
        $skills = implode(', ', array_slice($input['skills'] ?? [], 0, 10)) ?: 'No skills listed';

        $experienceLines = [];
        foreach (array_slice($input['experience'] ?? [], 0, 3) as $exp) {
            $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
            if ($line && ! empty($exp['bullets'])) {
                $line .= ' — '.explode("\n", $exp['bullets'])[0];
            }
            if ($line) {
                $experienceLines[] = $line;
            }
        }
        $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

        $jdSection = '';
        if (! empty($input['job_description'])) {
            $jd = $input['job_description'];
            $jdSection = "\n\nJob Description:\n{$jd}";
        }

        return <<<PROMPT
        You are an expert interview coach. Given the resume and target role below, generate exactly 8
        interview questions this candidate is likely to be asked, along with a STAR-framework coaching
        hint for each question.

        Target role: {$targetRole}

        Candidate profile:
        - Name: {$name}
        - Skills: {$skills}
        - Recent experience:
        {$experienceText}{$jdSection}

        Return a JSON array of exactly 8 objects with this shape:
        [{"question": "Tell me about...", "hint": "Think about a specific time when you..."}]

        Return ONLY the JSON array. No markdown fences, no explanation, no preamble.
        PROMPT;
    }

    /**
     * @param  array{resume_context?: array{summary?: ?string, experience?: array<mixed>, skills?: array<mixed>}|null}  $input
     */
    private static function careerCoach(array $input): string
    {
        $context = $input['resume_context'] ?? null;

        if ($context === null) {
            $resumeSection = 'The candidate has no resume on file yet — ask about their background '
                .'directly instead of assuming any prior experience.';
        } else {
            $summary = $context['summary'] ?? 'No summary provided.';
            $skills = implode(', ', array_slice($context['skills'] ?? [], 0, 15)) ?: 'No skills listed';

            $experienceLines = [];
            foreach (array_slice($context['experience'] ?? [], 0, 5) as $exp) {
                $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
                if ($line) {
                    $experienceLines[] = $line;
                }
            }
            $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

            $resumeSection = <<<CONTEXT
            Candidate's most recent resume:
            Summary: {$summary}
            Skills: {$skills}
            Experience:
            {$experienceText}
            CONTEXT;
        }

        return <<<PROMPT
        You are a supportive, practical career coach having an ongoing conversation with this candidate.
        Give specific, actionable advice grounded in their actual background below — do not invent
        employers, titles, or accomplishments they haven't mentioned. Keep replies conversational and
        concise (a few short paragraphs, not an essay).

        {$resumeSection}
        PROMPT;
    }

    /**
     * @param  array{tone?: string, job_description?: ?string, role?: ?string, company?: ?string, experience?: ?array<mixed>, skills?: ?array<mixed>}  $input
     */
    private static function coverLetter(array $input): string
    {
        $tone = $input['tone'] ?? 'formal';
        $role = $input['role'] ?? null;
        $company = $input['company'] ?? null;
        $jobDescription = $input['job_description'] ?? null;
        $skills = implode(', ', array_slice($input['skills'] ?? [], 0, 15)) ?: 'No skills listed';

        $experienceLines = [];
        foreach (array_slice($input['experience'] ?? [], 0, 5) as $exp) {
            $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
            if ($line) {
                $experienceLines[] = $line;
            }
        }
        $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

        $contextLines = [];
        if ($role) {
            $contextLines[] = "Target role: {$role}";
        }
        if ($company) {
            $contextLines[] = "Company: {$company}";
        }
        $context = $contextLines ? implode("\n", $contextLines) : 'No target role/company provided.';

        $jdSection = $jobDescription ? "\n\nJob description:\n{$jobDescription}" : '';

        return <<<PROMPT
        Write a complete, professional cover letter body in a {$tone} tone, grounded strictly in the
        candidate's experience and skills below — do not invent employers, titles, or accomplishments.
        Reference the job description if provided. Do not include a date header or salutation/signature
        block — the user will add those manually; write only the letter's message paragraphs.

        {$context}
        Skills: {$skills}
        Experience:
        {$experienceText}{$jdSection}

        Return ONLY the letter body text. No markdown fences, no explanation, no preamble.
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
