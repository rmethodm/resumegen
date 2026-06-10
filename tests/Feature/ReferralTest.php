<?php

namespace Tests\Feature;

use App\Actions\EnsureReferralCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralTest extends TestCase
{
    use RefreshDatabase;

    public function test_referral_redirect_stores_code_in_session(): void
    {
        $referrer = User::factory()->create(['referral_code' => 'TESTCODE123A']);
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
        $referrer = User::factory()->create(['referral_code' => 'TESTCODE123B']);
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
        $referrer = User::factory()->create(['referral_code' => 'TESTCODE123C']);
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
        $user = User::factory()->create(['referral_code' => 'TESTCODE123D']);

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

    public function test_referral_code_accessor_does_not_write_to_db(): void
    {
        $user = User::factory()->create(['referral_code' => null]);

        $queryCount = 0;
        \DB::listen(function ($q) use (&$queryCount) {
            if (str_contains(strtolower($q->sql), 'update')) {
                $queryCount++;
            }
        });

        $code = $user->referral_code;

        $this->assertSame(0, $queryCount, 'Reading referral_code should not trigger DB write');
        $this->assertNull($code);
    }

    public function test_ensure_referral_code_action_creates_and_persists_code(): void
    {
        $user = User::factory()->create(['referral_code' => null]);

        $code = EnsureReferralCode::for($user);

        $this->assertNotNull($code);
        $this->assertEquals(12, strlen($code));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'referral_code' => $code]);
    }

    public function test_ensure_referral_code_action_returns_existing_code(): void
    {
        $user = User::factory()->create(['referral_code' => 'EXISTINGCODE']);

        $code = EnsureReferralCode::for($user);

        $this->assertSame('EXISTINGCODE', $code);
    }
}
