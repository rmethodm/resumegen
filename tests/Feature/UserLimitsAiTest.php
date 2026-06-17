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
        $user = User::factory()->free()->create(); // free limit = 10
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
}
