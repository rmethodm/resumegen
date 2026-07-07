<?php

namespace Tests\Unit;

use App\Data\AiPrompts;
use PHPUnit\Framework\TestCase;

class AiPromptsTest extends TestCase
{
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
