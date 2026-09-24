<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return $this->redirectAfterTwoFactor($request);
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();
        $code = $request->input('code');

        // Recovery code path (longer than 6 chars)
        if (strlen($code) > 6) {
            $codes = $user->two_factor_recovery_codes ?? [];
            $matched = null;

            foreach ($codes as $index => $hashed) {
                if (Hash::check($code, $hashed)) {
                    $matched = $index;
                    break;
                }
            }

            if ($matched === null) {
                throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
            }

            unset($codes[$matched]);
            $user->two_factor_recovery_codes = array_values($codes);
            $user->save();

            $this->completeChallenge($request);

            if (count($user->two_factor_recovery_codes) < 2) {
                return $this->redirectAfterTwoFactor($request)
                    ->with('error', 'You have fewer than 2 recovery codes left — regenerate them in your profile.');
            }

            return $this->redirectAfterTwoFactor($request);
        }

        // TOTP path
        $google2fa = new Google2FA;
        $lastTimestampKey = '2fa_totp_last_ts_'.$user->id;
        // Never pass null as the old timestamp: Google2FA then returns `true`
        // instead of the matched timestep, and the replay guard below would
        // key on (and cache) `true`, protecting nothing.
        $valid = $google2fa->verifyKeyNewer($user->two_factor_secret, $code, Cache::get($lastTimestampKey) ?? 0);

        // Cache::add is atomic: of two concurrent requests replaying the same
        // code, only one can claim its timestep. The get-then-put on the
        // last-timestamp key alone leaves a race window between them.
        if ($valid === false
            || ! Cache::add('2fa_totp_used_'.$user->id.'_'.$valid, true, now()->addMinutes(2))) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        Cache::put($lastTimestampKey, $valid, now()->addMinutes(2));

        $this->completeChallenge($request);

        return $this->redirectAfterTwoFactor($request);
    }

    /**
     * Passing 2FA is a privilege step-up, so rotate the session ID: one
     * captured while only the password was proven must not carry over.
     */
    private function completeChallenge(Request $request): void
    {
        $request->session()->forget('two_factor_auth_pending');
        $request->session()->regenerate();
    }

    private function redirectAfterTwoFactor(Request $request): RedirectResponse
    {
        return redirect()->intended(route('dashboard', absolute: false));
    }
}
