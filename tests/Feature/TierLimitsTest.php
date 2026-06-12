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

    // ── allowedTemplates ──────────────────────────────────────────────────────

    public function test_free_user_gets_all_templates(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $allowed = UserLimits::allowedTemplates($user);
        $this->assertCount(9, $allowed);
        $this->assertContains('classic', $allowed);
        $this->assertContains('modern', $allowed);
        $this->assertContains('ats', $allowed);
        $this->assertContains('skills-first', $allowed);
        $this->assertContains('academic', $allowed);
        $this->assertContains('bold', $allowed);
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
