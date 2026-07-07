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

    public function test_career_map_includes_experience_and_skills(): void
    {
        $prompt = AiPrompts::build('career_map', [
            'experience' => [['title' => 'Backend Engineer', 'company' => 'Acme']],
            'skills' => ['PHP', 'Laravel'],
        ]);

        $this->assertStringContainsString('Backend Engineer', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
        $this->assertStringContainsString('title', $prompt);
        $this->assertStringContainsString('reasoning', $prompt);
        $this->assertStringContainsString('skill_gaps', $prompt);
    }

    public function test_career_map_handles_empty_input(): void
    {
        $prompt = AiPrompts::build('career_map', []);

        $this->assertStringContainsString('No experience listed', $prompt);
        $this->assertStringContainsString('No skills listed', $prompt);
    }

    public function test_translate_resume_includes_language_and_content(): void
    {
        $prompt = AiPrompts::build('translate_resume', [
            'language' => 'spanish',
            'content' => ['summary' => 'Senior backend engineer.', 'skills' => ['PHP', 'Laravel']],
        ]);

        $this->assertStringContainsString('Spanish', $prompt);
        $this->assertStringContainsString('Senior backend engineer.', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
        $this->assertStringContainsString('proper nouns', $prompt);
    }

    public function test_translate_resume_labels_mandarin(): void
    {
        $prompt = AiPrompts::build('translate_resume', [
            'language' => 'mandarin',
            'content' => ['summary' => 'Engineer.'],
        ]);

        $this->assertStringContainsString('Mandarin', $prompt);
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
