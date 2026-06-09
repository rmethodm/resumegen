<?php

namespace Tests\Feature;

use App\Models\ReferralEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReferralsTest extends TestCase
{
    use RefreshDatabase;

    public function test_referrals_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.referrals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Referrals/Index')
                ->has('events')
                ->has('leaderboard')
            );
    }

    public function test_referral_events_are_paginated(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $referrer = User::factory()->create(['referral_rewards_earned' => 3]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);
        ReferralEvent::create(['referrer_user_id' => $referrer->id, 'referred_user_id' => $referred->id, 'event_type' => 'upgrade']);

        $this->actingAs($admin)
            ->get(route('admin.referrals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 1)
                ->has('leaderboard', 1)
            );
    }

    public function test_referrals_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.referrals.index'))->assertForbidden();
    }
}
