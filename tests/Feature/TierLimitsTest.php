<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TierLimitsTest extends TestCase
{
    use RefreshDatabase;

    // ── resumeLimit ────────────────────────────────────────────────────────────

    public function test_free_user_resume_limit_is_5(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(5, UserLimits::resumeLimit($user));
    }

    public function test_starter_user_resume_limit_is_5(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(5, UserLimits::resumeLimit($user));
    }

    public function test_pro_user_resume_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::resumeLimit($user));
    }

    // ── coverLetterLimit ───────────────────────────────────────────────────────

    public function test_free_user_cover_letter_limit_is_3(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(3, UserLimits::coverLetterLimit($user));
    }

    public function test_starter_user_cover_letter_limit_is_5(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(5, UserLimits::coverLetterLimit($user));
    }

    public function test_pro_user_cover_letter_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::coverLetterLimit($user));
    }

    // ── jobLimit ───────────────────────────────────────────────────────────────

    public function test_free_user_job_limit_is_3(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(3, UserLimits::jobLimit($user));
    }

    public function test_starter_user_job_limit_is_null(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertNull(UserLimits::jobLimit($user));
    }

    // ── aiLimit ────────────────────────────────────────────────────────────────

    public function test_free_user_ai_limit_is_30(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(30, UserLimits::aiLimit($user));
    }

    public function test_starter_user_ai_limit_is_30(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(30, UserLimits::aiLimit($user));
    }

    public function test_pro_user_ai_limit_is_500(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertSame(500, UserLimits::aiLimit($user));
    }

    // ── allowedTemplates ──────────────────────────────────────────────────────

    public function test_free_user_gets_all_templates(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $allowed = UserLimits::allowedTemplates($user);
        $this->assertCount(13, $allowed);
        $this->assertContains('classic', $allowed);
        $this->assertContains('modern', $allowed);
        $this->assertContains('ats', $allowed);
        $this->assertContains('creative', $allowed);
        $this->assertContains('academic', $allowed);
        $this->assertContains('timeline', $allowed);
    }

    public function test_starter_user_gets_all_templates(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertCount(13, UserLimits::allowedTemplates($user));
    }

    public function test_pro_user_gets_all_templates(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertCount(13, UserLimits::allowedTemplates($user));
    }

    // ── canDocx / canAts ──────────────────────────────────────────────────────

    public function test_free_user_cannot_docx(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertFalse(UserLimits::canDocx($user));
    }

    public function test_starter_user_can_docx(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue(UserLimits::canDocx($user));
    }

    public function test_free_user_can_ats_within_monthly_limit(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertTrue(UserLimits::canAts($user));
    }

    public function test_starter_user_can_ats(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue(UserLimits::canAts($user));
    }

    // ── aiUsageThisPeriod ─────────────────────────────────────────────────────

    public function test_free_user_ai_usage_counts_current_month_only(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now()->subMonths(3),
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
        $this->assertSame(1, UserLimits::aiUsageThisPeriod($user));
    }

    public function test_starter_user_ai_usage_counts_current_month_only(): void
    {
        $user = User::factory()->starter()->create();
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now()->subMonths(2),
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
        $this->assertSame(1, UserLimits::aiUsageThisPeriod($user));
    }

    // ── atAiLimit ─────────────────────────────────────────────────────────────

    public function test_free_user_at_ai_limit_after_30_uses_this_month(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        for ($i = 0; $i < 30; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now(),
            ]);
        }
        $this->assertTrue(UserLimits::atAiLimit($user));
    }

    public function test_free_user_not_at_ai_limit_with_29_uses(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        for ($i = 0; $i < 29; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now(),
            ]);
        }
        $this->assertFalse(UserLimits::atAiLimit($user));
    }

    // ── planTier ──────────────────────────────────────────────────────────────

    public function test_master_admin_always_returns_pro_tier(): void
    {
        $user = User::factory()->create(['is_master_admin' => true, 'plan_tier' => 'free']);
        $this->assertSame('pro', $user->planTier());
    }

    public function test_is_pro_flag_returns_pro_tier(): void
    {
        $user = User::factory()->create(['is_pro' => true, 'plan_tier' => 'free']);
        $this->assertSame('pro', $user->planTier());
    }

    public function test_plan_tier_column_is_used_for_regular_users(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame('starter', $user->planTier());
    }

    public function test_default_user_returns_free_tier(): void
    {
        $user = User::factory()->create();
        $this->assertSame('free', $user->planTier());
    }

    // ── isAtLeastStarter ─────────────────────────────────────────────────────

    public function test_free_user_is_not_at_least_starter(): void
    {
        $user = User::factory()->create();
        $this->assertFalse($user->isAtLeastStarter());
    }

    public function test_starter_user_is_at_least_starter(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue($user->isAtLeastStarter());
    }

    public function test_pro_user_is_at_least_starter(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertTrue($user->isAtLeastStarter());
    }

    // ── tierFromPriceId ───────────────────────────────────────────────────────

    public function test_pro_monthly_price_resolves_to_pro_tier(): void
    {
        config(['services.stripe.pro_monthly_price_id' => 'price_pro_monthly']);
        $this->assertSame('pro', UserLimits::tierFromPriceId('price_pro_monthly'));
    }

    public function test_starter_yearly_price_resolves_to_starter_tier(): void
    {
        config(['services.stripe.starter_yearly_price_id' => 'price_starter_yearly']);
        $this->assertSame('starter', UserLimits::tierFromPriceId('price_starter_yearly'));
    }

    public function test_unknown_price_resolves_to_free(): void
    {
        $this->assertSame('free', UserLimits::tierFromPriceId('price_unknown'));
    }
}
