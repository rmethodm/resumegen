<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthHardeningTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Every Inertia page ships auth.user to the browser. A 2FA secret there
     * lets anyone with the page source (XSS, shared screen, extension) mint
     * valid codes forever; billing ids and signup IP are private too.
     */
    public function test_shared_auth_user_prop_never_contains_secrets(): void
    {
        $secret = (new Google2FA)->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret, // setup started, not confirmed: no challenge
            'registration_ip' => '203.0.113.77',
            'oauth_provider_id' => 'gh-9876543',
        ]);
        $user->forceFill(['stripe_id' => 'cus_SECRET123', 'pm_last_four' => '4242'])->save();

        $response = $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $props = json_encode($response->viewData('page')['props']);

        foreach ([$secret, '203.0.113.77', 'gh-9876543', 'cus_SECRET123', '4242'] as $leak) {
            $this->assertStringNotContainsString($leak, $props);
        }

        $this->assertSame(
            ['id', 'name', 'email', 'email_verified_at'],
            array_keys($response->viewData('page')['props']['auth']['user']),
        );
    }

    /**
     * A remember-me cookie restores the login on a fresh session without
     * going through LoginResponse. If that skipped the challenge, a stolen
     * cookie (or an old one) would defeat 2FA entirely.
     */
    public function test_remember_cookie_login_of_2fa_user_is_sent_to_the_challenge(): void
    {
        $user = $this->userWithRememberToken([
            'two_factor_secret' => (new Google2FA)->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withCookie(...$this->recallerCookie($user))
            ->get(route('dashboard'))
            ->assertRedirect(route('two-factor.challenge'));

        $this->assertTrue(session('two_factor_auth_pending'));
    }

    public function test_remember_cookie_login_without_2fa_is_not_challenged(): void
    {
        $user = $this->userWithRememberToken(['two_factor_confirmed_at' => null]);

        $this->withCookie(...$this->recallerCookie($user))
            ->get(route('dashboard'))
            ->assertOk();

        $this->assertAuthenticatedAs($user);
        $this->assertNull(session('two_factor_auth_pending'));
    }

    /**
     * An observed TOTP code must be single-use: a shoulder-surfed or
     * phished code replayed within its 30s window must not pass the challenge
     * again.
     */
    public function test_totp_code_cannot_be_replayed(): void
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
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $code])
            ->assertSessionHasErrors('code');
    }

    public function test_recovery_codes_cannot_be_generated_without_confirmed_2fa(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => null]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('two-factor.recovery-codes'))
            ->assertNotFound();

        $this->assertNull($user->fresh()->two_factor_recovery_codes);
    }

    /**
     * Auth mail goes through the queue so a slow or failing mail provider
     * can't stall (or 500) registration and forgot-password requests.
     */
    public function test_verification_and_reset_emails_are_queued(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->post(route('verification.send'));
        Auth::logout();
        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, QueuedVerifyEmail::class);
        Notification::assertSentTo($user, QueuedResetPassword::class);
        $this->assertTrue(is_subclass_of(QueuedVerifyEmail::class, ShouldQueue::class));
        $this->assertTrue(is_subclass_of(QueuedResetPassword::class, ShouldQueue::class));
    }

    /**
     * Persona links are copied onto resumes and rendered as clickable links;
     * a javascript: URL would execute when a recruiter clicks it.
     */
    public function test_persona_links_must_be_http_or_https(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.persona'), [
                'linkedin_url' => 'javascript:alert(1)',
                'website' => 'ftp://example.com',
            ])
            ->assertSessionHasErrors(['linkedin_url', 'website']);

        $this->actingAs($user)
            ->patch(route('profile.persona'), ['website' => 'https://example.com'])
            ->assertSessionHasNoErrors();

        $this->assertSame('https://example.com', $user->fresh()->profile['website']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function userWithRememberToken(array $attributes): User
    {
        $user = User::factory()->create($attributes);
        $user->setRememberToken(Str::random(60));
        $user->save();

        return $user;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function recallerCookie(User $user): array
    {
        return [
            Auth::guard('web')->getRecallerName(),
            $user->id.'|'.$user->getRememberToken().'|'.$user->getAuthPassword(),
        ];
    }
}
