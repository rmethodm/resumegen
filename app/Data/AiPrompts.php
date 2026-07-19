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
            'cover_letter' => self::coverLetter($input),
            'import_resume' => self::importResume($input),
            'rank_jobs' => self::rankJobs($input),
            'import_job_posting' => self::importJobPosting($input),
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
     * Score postings against a candidate's actual history. The model judges fit;
     * it never sources listings, so it is told plainly that the input list is the
     * whole world and inventing an id is a failure.
     *
     * @param  array{experience?: array<mixed>, skills?: array<mixed>, summary?: string, listings?: array<mixed>}  $input
     */
    private static function rankJobs(array $input): string
    {
        $experience = json_encode($input['experience'] ?? []);
        $skills = json_encode($input['skills'] ?? []);
        $summary = $input['summary'] ?? '';
        $listings = json_encode($input['listings'] ?? []);

        return <<<PROMPT
        You are screening job postings for one candidate. For each posting, judge how well the
        candidate's actual experience matches it.

        Score 0-100, where 80+ means they clearly meet the core requirements, 50-79 means a
        plausible stretch, and below 50 means a poor match. Give one short sentence of reasoning
        naming the specific thing that drove the score — a matching skill, a missing requirement,
        a seniority gap. Do not flatter; a bad match must score low.

        Score every posting in the list and no others. Use the exact "id" values given. Never
        invent a posting or an id.

        Return ONLY a JSON object of this shape, with no markdown fences or preamble:
        {"scores": [{"id": "<id from input>", "score": 0, "reason": ""}]}

        Candidate summary: {$summary}
        Candidate skills: {$skills}
        Candidate experience: {$experience}

        Postings: {$listings}
        PROMPT;
    }

    /**
     * Extract a posting from arbitrary scraped page text. Pages carry navigation,
     * cookie banners, and unrelated listings, so the model is told to prefer null
     * over a guess — a wrong company name is worse than a blank one.
     *
     * @param  array{text?: string, url?: string}  $input
     */
    private static function importJobPosting(array $input): string
    {
        // ponytail: same cap as resume import; a posting that needs more than this is an outlier
        $text = mb_substr($input['text'] ?? '', 0, 12000);
        $url = $input['url'] ?? '';

        return <<<PROMPT
        Extract the job posting from the page text below and return it as a single JSON object.

        Required JSON structure:
        {"title": "", "company": "", "location": "", "description": "", "salary_min": null, "salary_max": null}

        Rules:
        - Use null for any field the page does not clearly state. Do not guess or infer.
        - "description" is a plain-text summary of the role and its requirements, max 1500 characters.
        - Salaries are annual whole numbers in the page's own currency, or null.
        - If the page is not a job posting at all, return every field as null.

        Return ONLY the JSON object. No markdown fences, no explanation.

        Source URL: {$url}

        Page text:
        {$text}
        PROMPT;
    }

    /**
     * @param  array{text?: string}  $input
     */
    private static function importResume(array $input): string
    {
        // ponytail: cap prevents runaway costs on multi-page resumes; ~3000 tokens fits any single resume
        $text = mb_substr($input['text'] ?? '', 0, 12000);

        return <<<PROMPT
        You are a resume parser. Extract all information from the resume text below and return it as a single JSON object.

        Required JSON structure:
        {
          "contact": {
            "full_name": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": "",
            "website": ""
          },
          "summary": "",
          "experience": [
            {
              "id": "exp-1",
              "company": "",
              "title": "",
              "start_date": "",
              "end_date": "",
              "current": false,
              "bullets": "First bullet\\nSecond bullet"
            }
          ],
          "education": [
            {
              "id": "edu-1",
              "school": "",
              "degree": "",
              "field": "",
              "grad_year": ""
            }
          ],
          "projects": [
            {
              "id": "proj-1",
              "name": "",
              "description": "",
              "url": "",
              "start_date": "",
              "end_date": "",
              "bullets": "First bullet\\nSecond bullet"
            }
          ],
          "skills": ["skill1", "skill2"],
          "certifications": [
            {
              "id": "cert-1",
              "name": "",
              "issuer": "",
              "date": "",
              "expiration": "",
              "credential_id": ""
            }
          ]
        }

        Rules:
        - Use null for any field that is absent from the resume
        - bullets: each bullet point on its own line, no leading dash or symbol
        - skills: flat array of individual skill strings
        - IDs: sequential strings like exp-1, exp-2, edu-1, proj-1, cert-1, etc.
        - Return ONLY the JSON object, no prose or markdown

        RESUME TEXT:
        {$text}
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
