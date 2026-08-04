<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeDownloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_download_their_resume_as_a_pdf(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['full_name' => 'Maya Chen']);

        $response = $this->actingAs($user)->get(route('resumes.download', $resume));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_pdf_download_embeds_selected_open_source_font(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'full_name' => 'Maya Chen',
            'font' => 'roboto',
            'summary' => 'Engineer who ships.',
        ]);

        $response = $this->actingAs($user)->get(route('resumes.download', $resume));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertGreaterThan(1000, strlen($response->getContent()));
    }

    public function test_pdf_download_works_with_core_font_fallback(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'full_name' => 'Maya Chen',
            'font' => 'arial',
        ]);

        $this->actingAs($user)
            ->get(route('resumes.download', $resume))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_user_cannot_download_someone_elses_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();

        $this->actingAs($user)
            ->get(route('resumes.download', $resume))
            ->assertNotFound();
    }
}
