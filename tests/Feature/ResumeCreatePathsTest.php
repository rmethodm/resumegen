<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeCreatePathsTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_from_role_sample_seeds_content(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'sample' => 'software-engineer',
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));

        $this->assertSame('Software Engineer', $resume->target_role);
        $this->assertGreaterThan(0, $resume->experiences()->count());
        $this->assertGreaterThan(0, $resume->skills()->count());
        $this->assertNotSame('', $resume->summary);
    }

    public function test_create_from_plain_text_import(): void
    {
        $user = User::factory()->create();

        $text = <<<'TXT'
Alex Rivera
Product Manager
alex@example.com

SUMMARY
PM with roadmap ownership.

EXPERIENCE
Product Manager — Cascade
• Owned discovery for core workflow

SKILLS
Roadmap, Discovery, Metrics
TXT;

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'plain_text' => $text,
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));

        $this->assertSame('Alex Rivera', $resume->full_name);
        $this->assertSame('alex@example.com', $resume->email);
        $this->assertStringContainsString('roadmap', strtolower($resume->summary));
    }

    public function test_blank_create_still_works(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'));

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));
    }

    public function test_create_from_template_sets_template_and_opens_workstation(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'template' => 'modern',
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $this->assertSame('modern', $resume->template);
        $response->assertRedirect(route('resumes.workstation', $resume));
    }
}
