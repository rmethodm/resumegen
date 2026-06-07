<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_template_stats(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) =>
                $page->has('templateStats')
            );
    }

    public function test_template_stats_aggregates_per_template(): void
    {
        $user = User::factory()->create();

        $classicResume = Resume::factory()->create([
            'user_id' => $user->id,
            'template' => 'classic',
        ]);
        $modernResume = Resume::factory()->create([
            'user_id' => $user->id,
            'template' => 'modern',
        ]);

        // Create share links and events
        $classicLink = \App\Models\ResumeShareLink::factory()->create([
            'resume_id' => $classicResume->id,
        ]);
        \App\Models\ResumeShareEvent::create([
            'resume_share_link_id' => $classicLink->id,
            'resume_id' => $classicResume->id,
            'event' => 'page_view',
            'ip_hash' => 'abc',
        ]);
        \App\Models\ResumeShareEvent::create([
            'resume_share_link_id' => $classicLink->id,
            'resume_id' => $classicResume->id,
            'event' => 'page_view',
            'ip_hash' => 'def',
        ]);

        $modernLink = \App\Models\ResumeShareLink::factory()->create([
            'resume_id' => $modernResume->id,
        ]);
        \App\Models\ResumeShareEvent::create([
            'resume_share_link_id' => $modernLink->id,
            'resume_id' => $modernResume->id,
            'event' => 'page_view',
            'ip_hash' => 'ghi',
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));
        $response->assertInertia(fn ($page) =>
            $page->where('templateStats', fn ($stats) =>
                collect($stats)->firstWhere('template', 'classic')['views'] === 2
                && collect($stats)->firstWhere('template', 'modern')['views'] === 1
            )
        );
    }
}
