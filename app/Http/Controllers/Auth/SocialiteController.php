<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\RegistrationIpLimiter;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class SocialiteController extends Controller
{
    /**
     * Providers wired up in config/services.php + AppServiceProvider.
     * Keep in sync with the redirect/callback route constraint.
     */
    public const PROVIDERS = ['google', 'github', 'microsoft'];

    public function redirect(string $provider): RedirectResponse
    {
        return Socialite::driver($provider)->redirect();
    }

    public function callback(string $provider, Request $request): RedirectResponse
    {
        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (InvalidStateException) {
            return redirect()->route('login')->with('error', 'That sign-in link expired. Please try again.');
        }

        $user = User::query()
            ->where('oauth_provider', $provider)
            ->where('oauth_provider_id', $socialUser->getId())
            ->first();

        if ($user !== null && $user->isDisabled()) {
            return redirect()->route('login')->with('error', 'This account has been disabled.');
        }

        if ($user !== null) {
            Auth::login($user, remember: true);
            $request->session()->regenerate();

            return app(LoginResponseContract::class)->toResponse($request);
        }

        // Only trust the provider's email enough to attach it to an account
        // (new or existing) if the provider actually confirms it belongs to
        // this OAuth user — GitHub in particular can return an unverified
        // email address, which would otherwise let anyone take over an
        // existing account just by typing its email into a GitHub profile.
        $verifiedEmail = $this->verifiedEmail($provider, $socialUser);

        $existing = $verifiedEmail !== null
            ? User::query()->where('email', $verifiedEmail)->first()
            : null;

        if ($existing !== null) {
            if ($existing->isDisabled()) {
                return redirect()->route('login')->with('error', 'This account has been disabled.');
            }

            $existing->forceFill([
                'oauth_provider' => $provider,
                'oauth_provider_id' => $socialUser->getId(),
                'email_verified_at' => $existing->email_verified_at ?? now(),
            ])->save();

            Auth::login($existing, remember: true);
            $request->session()->regenerate();

            return app(LoginResponseContract::class)->toResponse($request);
        }

        if ($verifiedEmail === null && User::where('email', $socialUser->getEmail())->exists()) {
            // An account with this email exists, but this provider didn't
            // confirm the OAuth user actually owns it — refuse to link.
            return redirect()->route('login')->with(
                'error',
                'An account with this email already exists. Log in with your password, then link '.ucfirst($provider).' from your profile.',
            );
        }

        $ip = $request->ip();

        RegistrationIpLimiter::assertNotThrottled($ip);

        $user = User::create([
            'name' => $socialUser->getName() ?: $socialUser->getNickname() ?: $socialUser->getEmail(),
            'email' => $socialUser->getEmail(),
            'password' => Hash::make(Str::random(40)),
            'registration_ip' => $ip,
            'oauth_provider' => $provider,
            'oauth_provider_id' => $socialUser->getId(),
        ]);

        // Only skip the normal email-verification flow if the provider
        // actually confirmed this address; otherwise it behaves exactly
        // like a fresh password registration (unverified until confirmed).
        if ($verifiedEmail !== null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return app(LoginResponseContract::class)->toResponse($request);
    }

    /**
     * The provider-confirmed email for this OAuth user, or null if the
     * provider doesn't vouch for it. Google and Microsoft include a verified
     * flag on the profile itself; GitHub requires a separate check against
     * its emails endpoint.
     */
    private function verifiedEmail(string $provider, SocialiteUser $socialUser): ?string
    {
        $email = $socialUser->getEmail();

        if ($email === null) {
            return null;
        }

        return match ($provider) {
            'google', 'microsoft' => ($socialUser->user['email_verified'] ?? false) ? $email : null,
            'github' => $this->githubVerifiedEmail($socialUser),
            default => null,
        };
    }

    private function githubVerifiedEmail(SocialiteUser $socialUser): ?string
    {
        $response = Http::withToken($socialUser->token)->get('https://api.github.com/user/emails');

        if (! $response->ok()) {
            return null;
        }

        foreach ($response->json() ?? [] as $entry) {
            if (($entry['email'] ?? null) === $socialUser->getEmail() && ($entry['verified'] ?? false)) {
                return $entry['email'];
            }
        }

        return null;
    }
}
