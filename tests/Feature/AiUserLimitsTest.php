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

    public function test_monthly_limit_is_flat_for_every_account(): void
    {
        config()->set('ai.monthly_limit', 150);

        $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->create()));
        $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->create()));
    }

    /** The per-user override is the only thing that moves the cap off the flat default. */
    public function test_limit_override_beats_the_flat_default(): void
    {
        config()->set('ai.monthly_limit', 150);

        $user = User::factory()->create(['ai_limit_override' => 5]);

        $this->assertSame(5, UserLimits::aiMonthlyLimit($user));
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
        config()->set('ai.monthly_limit', 2);
        $user = User::factory()->create();

        $this->assertTrue(UserLimits::canUseAi($user));

        AiRequest::factory()->for($user)->count(2)->create(['created_at' => now()]);

        $this->assertFalse(UserLimits::canUseAi($user));
    }
}
