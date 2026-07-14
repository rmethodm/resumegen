<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsAiAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_override_replaces_flat_limit(): void
    {
        $user = User::factory()->create(['ai_limit_override' => 999]);

        $this->assertSame(999, UserLimits::aiMonthlyLimit($user));
    }

    public function test_null_override_falls_back_to_flat_limit(): void
    {
        config()->set('ai.monthly_limit', 25);
        $user = User::factory()->create(['ai_limit_override' => null]);

        $this->assertSame(25, UserLimits::aiMonthlyLimit($user));
    }

    public function test_blocked_user_cannot_use_ai(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);

        $this->assertFalse(UserLimits::canUseAi($user));
    }

    public function test_reset_watermark_excludes_earlier_requests(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->create([
            'status' => 'success',
            'created_at' => now()->startOfMonth()->addDays(2),
        ]);

        $this->assertSame(1, UserLimits::aiRequestsThisMonth($user));

        $user->update(['ai_usage_reset_at' => now()->startOfMonth()->addDays(5)]);

        $this->assertSame(0, UserLimits::aiRequestsThisMonth($user->fresh()));
    }
}
