<?php

namespace Database\Seeders;

use App\Models\FakeAiResponse;
use Illuminate\Database\Seeder;

class FakeAiResponseSeeder extends Seeder
{
    /**
     * Seed fake AI responses used when AI_FAKE_MODE=true, so testing never
     * spends real OpenAI tokens.
     */
    public function run(): void
    {
        foreach ($this->reviewResponses() as $preset => $variants) {
            foreach ($variants as $suggestions) {
                FakeAiResponse::create([
                    'feature' => 'resume_review',
                    'preset' => $preset,
                    'payload' => ['suggestions' => $suggestions],
                ]);
            }
        }

        foreach ($this->qaDraftResponses() as $text) {
            FakeAiResponse::create([
                'feature' => 'qa_bank_draft',
                'preset' => null,
                'payload' => ['text' => $text],
            ]);
        }
    }

    /**
     * @return array<string, array<int, array<int, array<string, string>>>>
     */
    private function reviewResponses(): array
    {
        $make = fn (string $id, string $label, string $severity, string $section, string $detail) => compact('id', 'label', 'severity', 'section', 'detail');

        return [
            'general' => [
                [
                    $make('summary-vague', 'Summary reads generically', 'medium', 'summary', 'The summary could apply to almost any candidate. Name the specific role and one standout achievement in the first sentence.'),
                    $make('exp-no-metrics', 'Experience bullets lack metrics', 'high', 'experience', 'Several bullets describe responsibilities without measurable outcomes. Add a number, percentage, or dollar figure to at least two bullets.'),
                    $make('skills-unordered', 'Skills list is not prioritized', 'low', 'skills', 'List the skills most relevant to the target role first, since recruiters scan top to bottom.'),
                ],
                [
                    $make('contact-missing-linkedin', 'No LinkedIn URL', 'low', 'contact', 'Adding a LinkedIn profile link gives recruiters an easy way to verify your background.'),
                    $make('exp-passive-voice', 'Bullets use passive voice', 'medium', 'experience', 'Rewrite bullets starting with action verbs (Led, Built, Reduced) instead of passive constructions.'),
                ],
            ],
            'tailor_jd' => [
                [
                    $make('jd-keyword-gap', 'Missing key terms from the job description', 'high', 'skills', 'The job description emphasizes terms not present anywhere in the resume. Add matching skills where truthful.'),
                    $make('jd-title-mismatch', 'Headline does not match target title', 'medium', 'summary', 'Align the headline more closely with the job description title to pass keyword screens.'),
                ],
                [
                    $make('jd-required-skill-absent', 'A required skill from the posting is absent', 'high', 'skills', 'The posting lists a required skill that does not appear in your skills or experience sections.'),
                    $make('jd-experience-not-tailored', 'Experience bullets are not tailored to this posting', 'medium', 'experience', 'Reorder or reword bullets to foreground the responsibilities this specific job asks for.'),
                ],
            ],
            'concise' => [
                [
                    $make('exp-wordy-bullet', 'Bullet is longer than it needs to be', 'medium', 'experience', 'This bullet repeats the same idea twice. Cut it to one clear sentence.'),
                    $make('summary-filler-words', 'Summary contains filler phrases', 'low', 'summary', 'Phrases like "responsible for" and "in charge of" add length without adding information.'),
                ],
                [
                    $make('exp-redundant-bullets', 'Two bullets say nearly the same thing', 'medium', 'experience', 'Merge these into a single, stronger bullet instead of repeating the point.'),
                ],
            ],
            'leadership' => [
                [
                    $make('exp-no-ownership', 'Bullet undersells ownership', 'high', 'experience', 'This reads like you supported the project rather than led it. If you owned the outcome, say so directly.'),
                    $make('exp-team-impact-missing', 'Team impact not mentioned', 'medium', 'experience', 'Mention team size or cross-functional scope to show leadership breadth.'),
                ],
                [
                    $make('summary-no-leadership-signal', 'Summary omits leadership framing', 'medium', 'summary', 'Add a phrase establishing your leadership scope (e.g. "led a team of 6") in the opening lines.'),
                ],
            ],
            'quantify' => [
                [
                    $make('exp-missing-percentage', 'Bullet lacks a measurable outcome', 'high', 'experience', 'Add a percentage or before/after figure to show the scale of the impact.'),
                    $make('exp-missing-dollar-figure', 'Cost or revenue impact not quantified', 'high', 'experience', 'If this work affected cost or revenue, state the dollar amount or range.'),
                ],
                [
                    $make('exp-vague-scale', 'Scale of work is vague', 'medium', 'experience', 'Replace "large" or "many" with an actual count or size.'),
                ],
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function qaDraftResponses(): array
    {
        return [
            "I'm drawn to this role because it combines the technical depth and team leadership I've built over my career. My background aligns closely with what you're looking for, and I'm excited about the opportunity to contribute from day one.",
            "In my most recent role, I led a project that directly improved team efficiency and delivered measurable results. I'd bring that same focus on outcomes to this position.",
            "I thrive in fast-paced environments where I can take ownership of a problem end to end. This role's scope matches how I like to work, and I'm confident I can make an immediate impact.",
            'My experience spans both the hands-on execution and the strategic planning this role requires, which lets me move quickly while keeping the bigger picture in mind.',
            "I'm looking for a role where I can grow into more leadership responsibility, and this position's mix of ownership and mentorship is exactly what I'm seeking next.",
        ];
    }
}
