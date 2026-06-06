<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ResumeGenerator;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResumeGeneratorTest extends TestCase
{
    private function fakeClaudeResponse(array $resumeData): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode($resumeData)]],
                'usage' => ['input_tokens' => 200, 'output_tokens' => 500],
            ]),
        ]);
    }

    public function test_generate_returns_resume_data(): void
    {
        $this->fakeClaudeResponse([
            'contact' => ['full_name' => '', 'email' => '', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => 'Experienced developer.',
            'experience' => [['title' => 'Engineer', 'company' => 'Acme', 'start_date' => '2022-01', 'end_date' => '', 'current' => true, 'bullets' => 'Built features']],
            'education' => [],
            'skills' => ['PHP', 'React'],
            'certifications' => [],
        ]);

        $user = User::factory()->make(['profile' => null]);
        $result = (new ResumeGenerator)->generate([
            'target_role' => 'Software Engineer',
            'years_experience' => 5,
            'industry' => 'Tech',
            'key_skills' => ['PHP', 'React'],
        ], $user);

        $this->assertArrayHasKey('contact', $result);
        $this->assertArrayHasKey('experience', $result);
        $this->assertSame('Experienced developer.', $result['summary']);
    }

    public function test_generate_merges_user_profile_into_contact(): void
    {
        $this->fakeClaudeResponse([
            'contact' => ['full_name' => 'AI Name', 'email' => 'ai@example.com', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => 'Developer.',
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ]);

        $user = User::factory()->make([
            'profile' => ['full_name' => 'Real Name', 'email' => 'real@example.com', 'phone' => '+1 555 0000', 'location' => 'SF', 'linkedin_url' => '', 'website' => ''],
        ]);

        $result = (new ResumeGenerator)->generate([
            'target_role' => 'Engineer',
            'years_experience' => 3,
            'industry' => 'Tech',
            'key_skills' => ['PHP'],
        ], $user);

        $this->assertSame('Real Name', $result['contact']['full_name']);
        $this->assertSame('real@example.com', $result['contact']['email']);
    }

    public function test_generate_throws_on_invalid_json_from_claude(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => 'not json']],
                'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
            ]),
        ]);

        $this->expectException(\RuntimeException::class);

        $user = User::factory()->make(['profile' => null]);
        (new ResumeGenerator)->generate([
            'target_role' => 'Engineer',
            'years_experience' => 3,
            'industry' => 'Tech',
            'key_skills' => ['PHP'],
        ], $user);
    }
}
