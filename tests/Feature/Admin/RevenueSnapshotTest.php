<?php

namespace Tests\Feature\Admin;

use App\Models\RevenueSnapshot;
use App\Models\User;
use App\Services\RevenueReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RevenueSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_captures_snapshot_with_computed_mrr(): void
    {
        config(['services.stripe.tier_prices' => ['starter' => 900, 'pro' => 1900, 'agency' => 4900]]);
        User::factory()->pro()->create(); // 1900

        $this->artisan('revenue:snapshot')->assertExitCode(0);

        $this->assertDatabaseHas('revenue_snapshots', [
            'mrr_cents' => 1900,
            'paying_users' => 1,
        ]);
        $this->assertSame(1, RevenueSnapshot::whereDate('captured_on', today())->count());
    }

    public function test_command_is_idempotent_per_day(): void
    {
        $this->artisan('revenue:snapshot')->assertExitCode(0);
        $this->artisan('revenue:snapshot')->assertExitCode(0);

        $this->assertSame(1, RevenueSnapshot::whereDate('captured_on', today())->count());
    }

    public function test_mrr_series_is_ordered_and_windowed(): void
    {
        RevenueSnapshot::create(['captured_on' => today()->subDays(100), 'mrr_cents' => 100, 'paying_users' => 1, 'free_users' => 0, 'active_subscriptions' => 1]);
        RevenueSnapshot::create(['captured_on' => today()->subDays(5), 'mrr_cents' => 1900, 'paying_users' => 1, 'free_users' => 0, 'active_subscriptions' => 1]);
        RevenueSnapshot::create(['captured_on' => today()->subDays(1), 'mrr_cents' => 3800, 'paying_users' => 2, 'free_users' => 0, 'active_subscriptions' => 2]);

        $series = (new RevenueReport)->mrrSeries('30d');

        $this->assertCount(2, $series); // 100-day-old excluded
        $this->assertSame(19, $series[0]['count']);  // $19, ordered oldest-first
        $this->assertSame(38, $series[1]['count']);  // $38
    }

    public function test_revenue_index_includes_mrr_series(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        RevenueSnapshot::create(['captured_on' => today(), 'mrr_cents' => 1900, 'paying_users' => 1, 'free_users' => 0, 'active_subscriptions' => 1]);

        $this->actingAs($admin)->get(route('admin.revenue.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('mrrSeries', 1)
                ->where('mrrSeries.0.count', 19)
            );
    }
}
