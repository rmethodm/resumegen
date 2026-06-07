<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViewCountBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_view_count_zero_when_no_events(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->where('resumes.0.view_count', 0)
            );
    }

    public function test_view_count_reflects_page_view_events(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        // 2 page_view events (should be counted)
        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'page_view',
            'ip_hash' => hash('sha256', '1.2.3.4'),
        ]);
        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'page_view',
            'ip_hash' => hash('sha256', '5.6.7.8'),
        ]);
        // 1 pdf_download (should NOT be counted)
        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'pdf_download',
            'ip_hash' => hash('sha256', '9.10.11.12'),
        ]);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->where('resumes.0.view_count', 2)
            );
    }

    public function test_snapshots_excluded_from_index(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        Resume::factory()->for($user)->create([
            'is_snapshot' => true,
            'parent_resume_id' => $parent->id,
        ]);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->has('resumes', 1)
            );
    }
}
