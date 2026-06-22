<?php

namespace Tests\Feature\Admin;

use App\Models\Resume;
use App\Models\User;
use App\Services\GrowthReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Laravel\Cashier\Subscription;
use Tests\TestCase;

class AdminGrowthTest extends TestCase
{
    use RefreshDatabase;

    public function test_signups_series_is_windowed(): void
    {
        User::factory()->create(['created_at' => now()->subDays(2)]);
        User::factory()->create(['created_at' => now()->subDays(2)]);
        User::factory()->create(['created_at' => now()->subDays(40)]); // outside 7d

        $series = (new GrowthReport)->signupsSeries('7d');

        $this->assertSame(2, array_sum(array_column($series, 'count')));
    }

    public function test_activation_rate(): void
    {
        $withResume = User::factory()->create();
        Resume::factory()->for($withResume)->create();
        User::factory()->create(); // no resume

        $this->assertSame(50.0, (new GrowthReport)->activationRate());
    }

    public function test_conversion_rate(): void
    {
        User::factory()->pro()->create();
        User::factory()->create(['plan_tier' => 'free']);
        User::factory()->create(['plan_tier' => 'free']);

        $this->assertSame(33.3, (new GrowthReport)->conversionRate());
    }

    public function test_funnel_counts(): void
    {
        $u = User::factory()->pro()->create();
        Resume::factory()->for($u)->create();
        User::factory()->create(['plan_tier' => 'free']);

        $funnel = (new GrowthReport)->funnel();

        $this->assertSame(['Signed up', 'Activated', 'Paying'], array_column($funnel, 'label'));
        $this->assertSame(2, $funnel[0]['count']); // signed up
        $this->assertSame(1, $funnel[1]['count']); // activated (has resume)
        $this->assertSame(1, $funnel[2]['count']); // paying
    }

    public function test_avg_days_to_convert(): void
    {
        $this->assertNull((new GrowthReport)->avgDaysToConvert());

        $user = User::factory()->create(['created_at' => now()->subDays(10)]);
        Subscription::create(['user_id' => $user->id, 'type' => 'default', 'stripe_id' => 'sub_x', 'stripe_status' => 'active', 'created_at' => now()->subDays(6)]);

        $this->assertSame(4.0, (new GrowthReport)->avgDaysToConvert());
    }

    public function test_index_renders(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)->get(route('admin.growth.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Growth/Index')
                ->where('period', '30d')
                ->has('kpis.activation_rate')
                ->has('signups')
                ->has('funnel')
            );
    }

    public function test_non_admin_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.growth.index'))->assertForbidden();
    }
}
