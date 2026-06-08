<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeSectionEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HeatmapTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_events_stored_for_valid_active_token(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [
                ['section' => 'summary', 'dwell_ms' => 3000],
                ['section' => 'experience', 'dwell_ms' => 8000],
            ],
        ])->assertOk();

        $this->assertDatabaseCount('resume_section_events', 2);
        $this->assertDatabaseHas('resume_section_events', ['section' => 'summary', 'dwell_ms' => 3000]);
    }

    public function test_invalid_or_inactive_token_returns_404(): void
    {
        $this->postJson('/r/no-such-token/section-events', [
            'sections' => [['section' => 'summary', 'dwell_ms' => 1000]],
        ])->assertStatus(404);

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => false]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [['section' => 'summary', 'dwell_ms' => 1000]],
        ])->assertStatus(404);
    }

    public function test_dwell_ms_is_clamped_to_120000(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [['section' => 'experience', 'dwell_ms' => 999999]],
        ])->assertOk();

        $this->assertEquals(120000, ResumeSectionEvent::first()->dwell_ms);
    }

    public function test_heatmap_page_returns_sections_aggregated_by_view_count(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        foreach (['experience', 'experience', 'summary'] as $section) {
            ResumeSectionEvent::create([
                'resume_id' => $resume->id,
                'section' => $section,
                'dwell_ms' => 5000,
                'ip_hash' => 'abc123',
            ]);
        }

        $this->actingAs($user)
            ->get(route('builder.heatmap', $resume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Heatmap')
                ->where('sections.0.section', 'experience')
                ->where('sections.0.view_count', 2)
            );
    }

    public function test_heatmap_page_requires_authentication(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->get(route('builder.heatmap', $resume->id))
            ->assertRedirect(route('login'));
    }
}
