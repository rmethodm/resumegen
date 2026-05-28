<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_page_returns_stats_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $resume->id,
            'event'                => 'page_view',
            'ip_hash'              => hash('sha256', '1.2.3.4'),
        ]);
        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $resume->id,
            'event'                => 'pdf_download',
            'ip_hash'              => hash('sha256', '1.2.3.4'),
        ]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('resumeStats.0.resume_id', $resume->id)
            ->where('resumeStats.0.page_views', 1)
            ->where('resumeStats.0.pdf_downloads', 1)
            ->where('resumeStats.0.unique_visitors', 1)
        );
    }

    public function test_analytics_does_not_include_other_users_resumes(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->create(['user_id' => $other->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $otherResume->id]);

        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $otherResume->id,
            'event'                => 'page_view',
            'ip_hash'              => hash('sha256', '9.9.9.9'),
        ]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('resumeStats', [])
        );
    }

    public function test_same_ip_on_same_day_counts_as_one_unique_visitor(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $ipHash = hash('sha256', '5.5.5.5');

        ResumeShareEvent::create(['resume_share_link_id' => $link->id, 'resume_id' => $resume->id, 'event' => 'page_view', 'ip_hash' => $ipHash]);
        ResumeShareEvent::create(['resume_share_link_id' => $link->id, 'resume_id' => $resume->id, 'event' => 'page_view', 'ip_hash' => $ipHash]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertInertia(fn ($page) => $page
            ->where('resumeStats.0.page_views', 2)
            ->where('resumeStats.0.unique_visitors', 1)
        );
    }
}
