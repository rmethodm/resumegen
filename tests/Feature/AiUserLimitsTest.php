<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUserLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_limit_resolves_per_tier(): void
    {
        config()->set('ai.monthly_limits', ['free' => 10, 'starter' => 100, 'pro' => 1000, 'agency' => 5000]);

        $this->assertSame(10, UserLimits::aiMonthlyLimit(User::factory()->free()->create()));
        $this->assertSame(100, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
        $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
    }

    public function test_requests_this_month_counts_only_current_month(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->create(['created_at' => now()]);
        AiRequest::factory()->for($user)->create(['created_at' => now()->subMonths(2)]);

        $this->assertSame(1, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_can_use_ai_respects_the_limit(): void
    {
        config()->set('ai.monthly_limits', ['free' => 2, 'starter' => 100, 'pro' => 1000, 'agency' => 5000]);
        $user = User::factory()->free()->create();

        $this->assertTrue(UserLimits::canUseAi($user));

        AiRequest::factory()->for($user)->count(2)->create(['created_at' => now()]);

        $this->assertFalse(UserLimits::canUseAi($user));
    }
}
