<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MobileAuthApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_issue_a_mobile_token(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $response = $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'secret-pass',
        ])->assertCreated();

        // The token works and carries the mobile ability.
        $this->withToken($response->json('token'))
            ->getJson('/api/resumes')
            ->assertOk();

        // Named so it shows in the Profile page's mobile-token list.
        $this->assertSame(
            MobileApiToken::TOKEN_NAME,
            $user->tokens()->sole()->name
        );
    }

    public function test_wrong_password_is_rejected_without_leaking_which_field(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'wrong',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_unverified_email_cannot_log_in(): void
    {
        $user = User::factory()->unverified()->create(['password' => 'secret-pass']);

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'secret-pass',
        ])->assertForbidden();
    }

    public function test_disabled_account_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'password' => 'secret-pass',
            'disabled_at' => now(),
        ]);

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'secret-pass',
        ])->assertForbidden();
    }

    public function test_two_factor_account_is_refused_password_only_login(): void
    {
        // Password-only API login must not silently bypass 2FA.
        $user = User::factory()->create([
            'password' => 'secret-pass',
            'two_factor_secret' => encrypt('secret'),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'secret-pass',
        ])->assertForbidden();

        $this->assertSame(0, $user->tokens()->count());
    }

    /**
     * Reinstalls and token loss mean repeated logins — without a cap the
     * token table grows forever. Newest 5 stay so other devices survive.
     */
    public function test_repeated_logins_keep_only_the_newest_five_mobile_tokens(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        // Six existing mobile tokens (login throttle is 5/min, so seed
        // directly — Profile-page tokens share the same name).
        for ($i = 0; $i < 6; $i++) {
            $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY]);
        }

        $latest = $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'secret-pass',
        ])->assertCreated()->json('token');

        $this->assertSame(5, $user->tokens()->count());
        $this->withToken($latest)->getJson('/api/resumes')->assertOk();
    }

    public function test_logout_revokes_only_the_calling_token(): void
    {
        $user = User::factory()->create();
        $keep = $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY])->plainTextToken;
        $revoke = $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY])->plainTextToken;

        $this->withToken($revoke)
            ->deleteJson('/api/auth/token')
            ->assertNoContent();

        $this->withToken($revoke)->getJson('/api/resumes')->assertUnauthorized();
        $this->withToken($keep)->getJson('/api/resumes')->assertOk();
    }
}
