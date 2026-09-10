<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\AiCreditService;
use App\Services\AiUsageLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class AiUsageLimiterTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    public function test_blocked_user_is_refused_even_with_credits_and_sub(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, 10, 'admin');
        $limiter = app(AiUsageLimiter::class);
        $this->assertFalse($limiter->allows($user, 1));
        $this->assertSame(429, $limiter->refusalStatus($user, 1));
    }

    public function test_subscriber_without_credits_gets_402(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        $limiter = app(AiUsageLimiter::class);
        $this->assertFalse($limiter->allows($user, 1));
        $this->assertSame(402, $limiter->refusalStatus($user, 1));
    }

    public function test_subscriber_with_credits_is_allowed(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, 5, 'admin');
        $this->assertTrue(app(AiUsageLimiter::class)->allows($user, 1));
        $this->assertNull(app(AiUsageLimiter::class)->refusalStatus($user, 1));
    }

    public function test_non_subscriber_gets_402_even_with_credits(): void
    {
        $user = User::factory()->create();
        app(AiCreditService::class)->grant($user, 10, 'admin');
        $limiter = app(AiUsageLimiter::class);

        $this->assertFalse($limiter->subscribedForAi($user));
        $this->assertFalse($limiter->allows($user, 1));
        $this->assertSame(402, $limiter->refusalStatus($user, 1));
    }

    public function test_remaining_delegates_to_credit_balance(): void
    {
        $user = User::factory()->create();
        app(AiCreditService::class)->grant($user, 7, 'admin');

        $this->assertSame(7, app(AiUsageLimiter::class)->remaining($user));
    }
}
