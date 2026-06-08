<?php

namespace Tests\Feature;

use App\Models\ReferralEvent;
use App\Models\User;
use App\Services\ReferralRewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_fires_referral_upgrade_event(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);

        $this->assertDatabaseHas('referral_events', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'upgrade',
        ]);
    }

    public function test_referrer_rewards_earned_is_incremented(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 0]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);

        $this->assertEquals(1, $referrer->fresh()->referral_rewards_earned);
    }

    public function test_double_upgrade_does_not_double_reward(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 0]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);
        ReferralRewardService::grantIfEligible($referred);

        $this->assertEquals(1, $referrer->fresh()->referral_rewards_earned);
        $this->assertDatabaseCount('referral_events', 1);
    }

    public function test_no_reward_when_user_has_no_referrer(): void
    {
        $user = User::factory()->create(['referred_by_user_id' => null]);

        ReferralRewardService::grantIfEligible($user);

        $this->assertDatabaseCount('referral_events', 0);
    }

    public function test_referral_show_returns_correct_upgrade_counts(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 2]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'signup',
        ]);
        ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'upgrade',
        ]);

        $this->actingAs($referrer)
            ->get(route('referral.show'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('totalSignups', 1)
                ->where('totalUpgrades', 1)
                ->where('rewardsEarned', 2)
            );
    }
}
