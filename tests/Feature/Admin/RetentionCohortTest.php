<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\UserActivityDay;
use App\Services\GrowthReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RetentionCohortTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_request_stamps_one_activity_row(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);

        $this->actingAs($user)->get('/dashboard')->assertOk();
        $this->actingAs($user)->get('/dashboard')->assertOk(); // same session/day

        $this->assertSame(1, UserActivityDay::where('user_id', $user->id)->count());
    }

    public function test_guest_request_stamps_nothing(): void
    {
        $this->get('/')->assertOk();

        $this->assertSame(0, UserActivityDay::count());
    }

    public function test_retention_week_zero(): void
    {
        $active = User::factory()->create(['created_at' => now()->startOfWeek()]);
        UserActivityDay::create(['user_id' => $active->id, 'activity_date' => now()->toDateString()]);

        $inactive = User::factory()->create(['created_at' => now()->startOfWeek()]);

        $cohorts = (new GrowthReport)->retentionCohorts(6);

        $this->assertNotEmpty($cohorts);
        $thisWeek = collect($cohorts)->firstWhere('cohort', now()->startOfWeek()->toDateString());
        $this->assertNotNull($thisWeek);
        $this->assertSame(2, $thisWeek['size']);
        $this->assertSame(50.0, $thisWeek['retention'][0]); // 1 of 2 active in week 0
    }

    public function test_growth_index_includes_retention(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)->get(route('admin.growth.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('retention'));
    }
}
