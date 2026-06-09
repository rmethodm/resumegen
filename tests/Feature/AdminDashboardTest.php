<?php

namespace Tests\Feature;

use App\Models\CareerArticle;
use App\Models\Organization;
use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_loads_for_master_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->has('stats.users')
                ->has('stats.organizations')
                ->has('stats.unread_messages')
                ->has('stats.referral_conversions')
                ->has('stats.job_titles_count')
                ->has('stats.ai_rates_count')
                ->has('stats.published_articles')
            );
    }

    public function test_dashboard_stat_counts_are_accurate(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->count(3)->create();
        Organization::factory()->count(2)->create(['owner_id' => $admin->id]);
        PortfolioMessage::factory()->count(4)->create(['user_id' => $admin->id, 'read_at' => null]);
        PortfolioMessage::factory()->count(1)->create(['user_id' => $admin->id, 'read_at' => now()]);
        CareerArticle::factory()->count(2)->published()->create();
        CareerArticle::factory()->count(1)->draft()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->where('stats.users', 4) // admin + 3
            ->where('stats.organizations', 2)
            ->where('stats.unread_messages', 4)
            ->where('stats.published_articles', 2)
        );
    }

    public function test_dashboard_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_dashboard_blocked_for_guest(): void
    {
        $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
    }
}
