<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TierLimitsTest extends TestCase
{
    use RefreshDatabase;

    // ── resumeLimit ────────────────────────────────────────────────────────────

    public function test_free_user_resume_limit_is_2(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(2, UserLimits::resumeLimit($user));
    }

    public function test_starter_user_resume_limit_is_10(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(10, UserLimits::resumeLimit($user));
    }

    public function test_pro_user_resume_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::resumeLimit($user));
    }

    // ── coverLetterLimit ───────────────────────────────────────────────────────

    public function test_free_user_cover_letter_limit_is_2(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(2, UserLimits::coverLetterLimit($user));
    }

    public function test_starter_user_cover_letter_limit_is_10(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(10, UserLimits::coverLetterLimit($user));
    }

    public function test_pro_user_cover_letter_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::coverLetterLimit($user));
    }

    // ── allowedTemplates ──────────────────────────────────────────────────────

    public function test_free_user_gets_only_free_templates(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $allowed = UserLimits::allowedTemplates($user);
        $this->assertEqualsCanonicalizing(['classic', 'modern', 'minimal', 'ats'], $allowed);
        $this->assertNotContains('executive', $allowed);
        $this->assertNotContains('academic', $allowed);
        $this->assertNotContains('bold', $allowed);
    }

    public function test_starter_user_gets_all_templates(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertCount(9, UserLimits::allowedTemplates($user));
    }

    public function test_pro_user_gets_all_templates(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertCount(9, UserLimits::allowedTemplates($user));
    }

    // ── canDocx ──────────────────────────────────────────────────────────────

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

    // ── planTier ──────────────────────────────────────────────────────────────

    public function test_master_admin_resolves_to_agency_tier(): void
    {
        $user = User::factory()->create(['is_master_admin' => true, 'plan_tier' => 'free']);
        $this->assertSame('agency', $user->planTier());
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

    // ── aiMonthlyLimit ────────────────────────────────────────────────────────

    public function test_ai_monthly_limits_per_tier(): void
    {
        $this->assertSame(10, UserLimits::aiMonthlyLimit(User::factory()->create(['plan_tier' => 'free'])));
        $this->assertSame(150, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
        $this->assertSame(500, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
        $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->agency()->create()));
    }

    // ── canAiTailoring ────────────────────────────────────────────────────────

    public function test_ai_tailoring_gated_to_starter_and_above(): void
    {
        $this->assertFalse(UserLimits::canAiTailoring(User::factory()->create(['plan_tier' => 'free'])));
        $this->assertTrue(UserLimits::canAiTailoring(User::factory()->starter()->create()));
        $this->assertTrue(UserLimits::canAiTailoring(User::factory()->pro()->create()));
        $this->assertTrue(UserLimits::canAiTailoring(User::factory()->agency()->create()));
    }
}
