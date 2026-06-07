<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralTest extends TestCase
{
    use RefreshDatabase;

    public function test_referral_redirect_stores_code_in_session(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $response = $this->get(route('referral.redirect', $code));

        $response->assertRedirect(route('register'));
        $response->assertSessionHas('referral_code', $code);
    }

    public function test_referral_redirect_404_for_unknown_code(): void
    {
        $response = $this->get(route('referral.redirect', 'NOTACODE'));

        $response->assertStatus(404);
    }

    public function test_registration_sets_referred_by_from_session(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $this->withSession(['referral_code' => $code])
            ->post(route('register'), [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

        $newUser = User::where('email', 'new@example.com')->first();
        $this->assertEquals($referrer->id, $newUser->referred_by_user_id);
    }

    public function test_registration_logs_referral_signup_event(): void
    {
        $referrer = User::factory()->create();
        $code = $referrer->referral_code;

        $this->withSession(['referral_code' => $code])
            ->post(route('register'), [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

        $this->assertDatabaseHas('referral_events', [
            'referrer_user_id' => $referrer->id,
            'event_type' => 'signup',
        ]);
    }

    public function test_referral_show_returns_stats(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('referral.show'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Referral/Index')
            ->has('referralCode')
            ->has('referralUrl')
            ->has('totalSignups')
            ->has('totalUpgrades')
            ->has('rewardsEarned')
        );
    }

    public function test_referral_code_auto_generated_on_first_access(): void
    {
        $user = User::factory()->create(['referral_code' => null]);

        $code = $user->referral_code;

        $this->assertNotNull($code);
        $this->assertEquals(12, strlen($code));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'referral_code' => $code]);
    }
}
