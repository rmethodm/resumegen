<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_has_two_factor_enabled_returns_false_when_not_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => null]);
        $this->assertFalse($user->hasTwoFactorEnabled());
    }

    public function test_has_two_factor_enabled_returns_true_when_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);
        $this->assertTrue($user->hasTwoFactorEnabled());
    }

    public function test_enable_generates_secret_but_not_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => null]);

        $this->actingAs($user)
            ->post(route('two-factor.enable'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
    }

    public function test_confirm_with_valid_code_sets_confirmed_at_and_generates_recovery_codes(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ]);

        $code = $google2fa->getCurrentOtp($secret);

        $this->actingAs($user)
            ->post(route('two-factor.confirm'), ['code' => $code])
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNotNull($user->two_factor_confirmed_at);
        $this->assertCount(8, $user->two_factor_recovery_codes);
    }

    public function test_confirm_with_invalid_code_returns_error(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('two-factor.confirm'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $user->refresh();
        $this->assertNull($user->two_factor_confirmed_at);
    }

    public function test_disable_requires_password_confirmation(): void
    {
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->delete(route('two-factor.disable'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_disable_with_confirmed_password_clears_2fa(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => 'somesecret',
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt('code1')],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('two-factor.disable'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->two_factor_recovery_codes);
    }

    public function test_regenerate_recovery_codes_replaces_existing(): void
    {
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt('old-code')],
        ]);

        $this->actingAs($user)
            ->post(route('two-factor.recovery-codes'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertCount(8, $user->two_factor_recovery_codes);
    }
}
