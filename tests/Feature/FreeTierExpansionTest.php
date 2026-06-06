<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreeTierExpansionTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_resume_limit_is_5(): void
    {
        $user = User::factory()->free()->create();

        $this->assertEquals(5, UserLimits::resumeLimit($user));
    }

    public function test_free_user_cover_letter_limit_is_3(): void
    {
        $user = User::factory()->free()->create();

        $this->assertEquals(3, UserLimits::coverLetterLimit($user));
    }

    public function test_free_user_ai_limit_is_30_per_month(): void
    {
        $user = User::factory()->free()->create();

        $this->assertEquals(30, UserLimits::aiLimit($user));
    }

    public function test_free_user_ai_usage_ignores_previous_month(): void
    {
        $user = User::factory()->free()->create();

        AiUsageLog::create([
            'user_id' => $user->id,
            'provider' => 'anthropic',
            'model' => 'claude-opus-4-8',
            'feature' => 'suggest',
            'input_tokens' => 100,
            'output_tokens' => 50,
            'cost_usd' => 0.001,
            'created_at' => now()->subMonth(),
        ]);

        $this->assertEquals(0, UserLimits::aiUsageThisPeriod($user));
    }

    public function test_free_user_can_use_all_templates(): void
    {
        $user = User::factory()->free()->create();
        $allowed = UserLimits::allowedTemplates($user);

        foreach (['creative', 'executive', 'sidebar', 'minimal', 'timeline'] as $template) {
            $this->assertContains($template, $allowed);
        }
    }

    public function test_free_user_can_use_ats_score_up_to_3_per_month(): void
    {
        $user = User::factory()->free()->create();

        $this->assertTrue(UserLimits::canAts($user));

        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);

        $this->assertFalse(UserLimits::canAts($user));
    }

    public function test_free_user_ats_usage_resets_each_month(): void
    {
        $user = User::factory()->free()->create();

        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0, 'created_at' => now()->subMonth()]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0, 'created_at' => now()->subMonth()]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0, 'created_at' => now()->subMonth()]);

        $this->assertTrue(UserLimits::canAts($user));
    }

    public function test_starter_has_unlimited_ats(): void
    {
        $user = User::factory()->starter()->create();

        for ($i = 0; $i < 10; $i++) {
            AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        }

        $this->assertTrue(UserLimits::canAts($user));
    }

    public function test_free_user_can_use_interview_coach_up_to_3_per_month(): void
    {
        $user = User::factory()->free()->create();

        $this->assertTrue(UserLimits::canInterviewCoach($user));

        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'interview_coach', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'interview_coach', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'interview_coach', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);

        $this->assertFalse(UserLimits::canInterviewCoach($user));
    }

    public function test_free_user_can_import_pdf(): void
    {
        $user = User::factory()->free()->create();

        $this->assertTrue(UserLimits::canPdfImport($user));
    }

    public function test_ats_uses_remaining_is_correct(): void
    {
        $user = User::factory()->free()->create();

        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'ats_score', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);

        $this->assertEquals(2, UserLimits::atsUsesRemaining($user));
    }

    public function test_starter_ats_uses_remaining_is_null(): void
    {
        $user = User::factory()->starter()->create();

        $this->assertNull(UserLimits::atsUsesRemaining($user));
    }

    public function test_interview_coach_uses_remaining_is_correct(): void
    {
        $user = User::factory()->free()->create();

        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'interview_coach', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);
        AiUsageLog::create(['user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-opus-4-8', 'feature' => 'interview_coach', 'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0]);

        $this->assertEquals(1, UserLimits::interviewCoachUsesRemaining($user));
    }

    public function test_starter_interview_coach_uses_remaining_is_null(): void
    {
        $user = User::factory()->starter()->create();

        $this->assertNull(UserLimits::interviewCoachUsesRemaining($user));
    }

    public function test_edit_page_passes_ats_uses_remaining_prop(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume))
            ->assertInertia(fn ($page) => $page->has('atsUsesRemaining'));
    }
}
