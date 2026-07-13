<?php

namespace Tests\Unit;

use App\Data\AiPrompts;
use PHPUnit\Framework\TestCase;

class AiPromptsTest extends TestCase
{
    public function test_rewrite_bullet_includes_the_text(): void
    {
        $prompt = AiPrompts::build('rewrite_bullet', ['text' => 'managed a team of five']);

        $this->assertStringContainsString('managed a team of five', $prompt);
        $this->assertNotEmpty($prompt);
    }

    public function test_generate_summary_includes_serialized_content(): void
    {
        $prompt = AiPrompts::build('generate_summary', [
            'experience' => [['title' => 'Engineer', 'company' => 'Acme']],
            'skills' => ['PHP', 'React'],
        ]);

        $this->assertStringContainsString('Engineer', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
    }

    public function test_ats_keywords_includes_role(): void
    {
        $prompt = AiPrompts::build('ats_keywords', [
            'role' => 'Senior Backend Engineer',
            'experience' => [],
            'skills' => ['Go'],
        ]);

        $this->assertStringContainsString('Senior Backend Engineer', $prompt);
    }

    public function test_career_coach_includes_resume_context(): void
    {
        $prompt = AiPrompts::build('career_coach', [
            'resume_context' => [
                'summary' => 'Senior backend engineer.',
                'experience' => [['title' => 'Engineer', 'company' => 'Acme']],
                'skills' => ['PHP', 'Laravel'],
            ],
        ]);

        $this->assertStringContainsString('Senior backend engineer.', $prompt);
        $this->assertStringContainsString('Engineer', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
    }

    public function test_career_coach_handles_missing_resume(): void
    {
        $prompt = AiPrompts::build('career_coach', ['resume_context' => null]);

        $this->assertStringContainsString('no resume', strtolower($prompt));
    }

    /**
     * The whole point of critique mode is that the model does NOT supply the words. If this
     * instruction ever falls out of the prompt, the feature silently becomes a second rewrite
     * button and the resume stops being the candidate's own.
     */
    public function test_critique_bullet_forbids_writing_replacement_text(): void
    {
        $prompt = AiPrompts::build('critique_bullet', ['text' => 'Responsible for managing the sales team.']);

        $this->assertStringContainsString('Responsible for managing the sales team.', $prompt);
        $this->assertStringContainsString('Do NOT rewrite', $prompt);
        $this->assertStringContainsString('themselves', $prompt);
    }

    public function test_critique_bullet_asks_for_the_facts_a_recruiter_needs(): void
    {
        $prompt = AiPrompts::build('critique_bullet', ['text' => 'Did some work.']);

        $this->assertStringContainsString('at most 3', $prompt);
        $this->assertStringContainsString('one per line', $prompt);
    }

    public function test_cover_letter_prompt_includes_tone_and_role_and_company(): void
    {
        $prompt = AiPrompts::build('cover_letter', [
            'tone' => 'warm',
            'job_description' => null,
            'role' => 'Senior Engineer',
            'company' => 'Acme Corp',
            'experience' => [],
            'skills' => [],
        ]);

        $this->assertStringContainsString('warm', $prompt);
        $this->assertStringContainsString('Senior Engineer', $prompt);
        $this->assertStringContainsString('Acme Corp', $prompt);
        $this->assertStringContainsString('Return ONLY the letter body text', $prompt);
    }

    public function test_cover_letter_prompt_includes_job_description_when_present(): void
    {
        $prompt = AiPrompts::build('cover_letter', [
            'tone' => 'formal',
            'job_description' => 'Looking for a React expert.',
            'role' => null,
            'company' => null,
            'experience' => [],
            'skills' => [],
        ]);

        $this->assertStringContainsString('Looking for a React expert.', $prompt);
    }

    public function test_unknown_feature_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        AiPrompts::build('not_a_real_feature', []);
    }
}
