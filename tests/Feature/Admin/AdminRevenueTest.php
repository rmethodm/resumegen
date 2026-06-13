<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Services\RevenueReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Laravel\Cashier\Subscription;
use Tests\TestCase;

class AdminRevenueTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_master_admin' => true]);
    }

    public function test_tier_counts_zero_fill_and_count(): void
    {
        User::factory()->count(2)->create(['plan_tier' => 'free']);
        User::factory()->starter()->create();
        User::factory()->pro()->count(3)->create();

        $counts = (new RevenueReport)->tierCounts();

        $this->assertSame(2, $counts['free']);
        $this->assertSame(1, $counts['starter']);
        $this->assertSame(3, $counts['pro']);
        $this->assertSame(0, $counts['agency']); // zero-filled
    }

    public function test_mrr_cents_math(): void
    {
        config(['services.stripe.tier_prices' => ['starter' => 900, 'pro' => 1900, 'agency' => 4900]]);

        User::factory()->starter()->count(2)->create(); // 1800
        User::factory()->pro()->create();               // 1900
        User::factory()->create(['plan_tier' => 'agency']); // 4900
        User::factory()->create(['plan_tier' => 'free']);   // 0

        $this->assertSame(1800 + 1900 + 4900, (new RevenueReport)->mrrCents());
    }

    public function test_active_subscriptions_excludes_ended(): void
    {
        $u = User::factory()->create();
        Subscription::create(['user_id' => $u->id, 'type' => 'default', 'stripe_id' => 'sub_a', 'stripe_status' => 'active']);
        Subscription::create(['user_id' => $u->id, 'type' => 'default', 'stripe_id' => 'sub_b', 'stripe_status' => 'active', 'ends_at' => now()->subDay()]);
        Subscription::create(['user_id' => $u->id, 'type' => 'default', 'stripe_id' => 'sub_c', 'stripe_status' => 'canceled']);

        $this->assertSame(1, (new RevenueReport)->activeSubscriptions());
    }

    public function test_live_active_subscriptions_null_without_secret(): void
    {
        config(['cashier.secret' => null]);

        $this->assertNull((new RevenueReport)->liveActiveSubscriptions());
    }

    public function test_index_renders_with_kpis(): void
    {
        config(['services.stripe.tier_prices' => ['starter' => 900, 'pro' => 1900, 'agency' => 4900]]);
        User::factory()->pro()->create();

        $this->actingAs($this->admin())->get(route('admin.revenue.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Revenue/Index')
                ->where('period', '30d')
                ->has('kpis.mrr_cents')
                ->has('tierBars')
                ->has('series')
                ->has('recent')
                ->has('liveActiveSubscriptions') // null or int
            );
    }

    public function test_non_admin_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.revenue.index'))->assertForbidden();
    }
}
