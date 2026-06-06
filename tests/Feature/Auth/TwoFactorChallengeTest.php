<?php

namespace Tests\Feature\Auth;

use App\Mail\TwoFactorCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorChallengeTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_2fa_enabled_sets_pending_flag_and_redirects(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect(route('two-factor.challenge'));

        $this->assertEquals(true, session('two_factor_auth_pending'));
    }

    public function test_login_without_2fa_enabled_proceeds_normally(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_confirmed_at' => null,
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect(route('dashboard'));

        $this->assertNull(session('two_factor_auth_pending'));
    }

    public function test_challenge_page_requires_pending_flag(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($user)
            ->get(route('two-factor.challenge'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_challenge_page_renders_with_pending_flag(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $response = $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->get(route('two-factor.challenge'));

        // assertOk ensures the page renders (not a redirect)
        $response->assertOk();
    }

    public function test_valid_totp_code_clears_pending_flag_and_redirects(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $code = $google2fa->getCurrentOtp($secret);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $code])
            ->assertRedirect(route('dashboard'));

        $this->assertNull(session('two_factor_auth_pending'));
    }

    public function test_invalid_totp_code_returns_error(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => '000000'])
            ->assertSessionHasErrors('code');
    }

    public function test_valid_recovery_code_is_consumed(): void
    {
        $plainCodes = ['AAAA-BBBB-CC', 'DDDD-EEEE-FF'];
        $hashedCodes = array_map(fn ($c) => bcrypt($c), $plainCodes);

        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $hashedCodes,
        ]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => 'AAAA-BBBB-CC'])
            ->assertRedirect(route('dashboard'));

        $user->refresh();
        $this->assertCount(1, $user->two_factor_recovery_codes);
    }

    public function test_used_recovery_code_cannot_be_reused(): void
    {
        $plain = 'AAAA-BBBB-CC';
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt($plain)],
        ]);

        // First use — succeeds
        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $plain]);

        $user->refresh();

        // Second use — fails (code was consumed)
        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $plain])
            ->assertSessionHasErrors('code');
    }

    public function test_email_otp_is_sent_and_session_flag_set(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        Mail::fake();

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.email'))
            ->assertRedirect(route('two-factor.challenge'))
            ->assertSessionHas('two_factor_email_sent', true);

        Mail::assertSent(TwoFactorCodeMail::class);
    }
}
