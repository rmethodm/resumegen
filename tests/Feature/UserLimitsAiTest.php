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
        $user = User::factory()->create();
        AiRequest::factory()->count(2)->create(['user_id' => $user->id, 'status' => 'success']);
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'error']);

        $this->assertSame(2, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_remaining_is_limit_minus_successes(): void
    {
        config()->set('ai.monthly_limit', 10);
        $user = User::factory()->create();
        AiRequest::factory()->count(4)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(6, UserLimits::aiRemaining($user));
    }

    public function test_remaining_never_negative(): void
    {
        config()->set('ai.monthly_limit', 1);
        $user = User::factory()->create();
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(0, UserLimits::aiRemaining($user));
    }

    /**
     * A zero quota means AI is switched off for that account — it never had a limit to
     * "reach", so "limit reached" reads as a bug. An account with a real quota gets the
     * accurate message once it exhausts it.
     */
    public function test_limit_message_distinguishes_no_quota_from_exhausted_quota(): void
    {
        config()->set('ai.monthly_limit', 0);

        $this->assertSame(
            'AI features are unavailable on this account.',
            UserLimits::aiLimitMessage(User::factory()->create())
        );

        config()->set('ai.monthly_limit', 150);

        $this->assertSame(
            'Monthly AI limit reached.',
            UserLimits::aiLimitMessage(User::factory()->create())
        );
    }
}
