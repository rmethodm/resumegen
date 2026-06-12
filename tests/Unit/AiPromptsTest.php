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

    public function test_unknown_feature_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        AiPrompts::build('nope', []);
    }
}
