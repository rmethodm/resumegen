<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsAiTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_count_ignores_error_rows(): void
    {
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(2)->create(['user_id' => $user->id, 'status' => 'success']);
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'error']);

        $this->assertSame(2, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_remaining_is_limit_minus_successes(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(4)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(6, UserLimits::aiRemaining($user));
    }

    public function test_remaining_never_negative(): void
    {
        config()->set('ai.monthly_limits.free', 1);
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(0, UserLimits::aiRemaining($user));
    }

    public function test_can_upgrade_by_tier(): void
    {
        $this->assertTrue(UserLimits::aiCanUpgrade(User::factory()->free()->create()));
        $this->assertTrue(UserLimits::aiCanUpgrade(User::factory()->starter()->create()));
        $this->assertFalse(UserLimits::aiCanUpgrade(User::factory()->pro()->create()));
    }

    public function test_next_tier_by_tier(): void
    {
        $this->assertSame('starter', UserLimits::aiNextTier(User::factory()->free()->create()));
        $this->assertSame('pro', UserLimits::aiNextTier(User::factory()->starter()->create()));
        $this->assertNull(UserLimits::aiNextTier(User::factory()->pro()->create()));
    }

    /**
     * A free user has a quota of 0, so "limit reached" tells them they used up
     * something they never had — it reads as a bug, not a paywall. Tiers with a
     * real quota keep the accurate message.
     */
    public function test_limit_message_distinguishes_no_quota_from_exhausted_quota(): void
    {
        $this->assertSame(
            'AI features require a paid plan.',
            UserLimits::aiLimitMessage(User::factory()->free()->create())
        );

        $this->assertSame(
            'Monthly AI limit reached.',
            UserLimits::aiLimitMessage(User::factory()->starter()->create())
        );
    }
}
