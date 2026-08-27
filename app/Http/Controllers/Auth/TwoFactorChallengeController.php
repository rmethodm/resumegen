<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnforceAdminSessionIdleTimeout;
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

            $request->session()->forget('two_factor_auth_pending');

            if (count($user->two_factor_recovery_codes) < 2) {
                return $this->redirectAfterTwoFactor($request)
                    ->with('error', 'You have fewer than 2 recovery codes left — regenerate them in your profile.');
            }

            return $this->redirectAfterTwoFactor($request);
        }

        // TOTP path
        $google2fa = new Google2FA;
        $lastTimestampKey = '2fa_totp_last_ts_'.$user->id;
        $valid = $google2fa->verifyKeyNewer($user->two_factor_secret, $code, Cache::get($lastTimestampKey));

        if ($valid === false) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        Cache::put($lastTimestampKey, $valid, now()->addMinutes(2));

        $request->session()->forget('two_factor_auth_pending');

        return $this->redirectAfterTwoFactor($request);
    }

    private function redirectAfterTwoFactor(Request $request): RedirectResponse
    {
        $adminDomain = config('app.admin_domain');
        $onAdminHost = is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain;

        if ($onAdminHost && $request->user()?->isAdmin()) {
            // Fortify regenerates on password login; regenerate again after the
            // 2FA step so the post-challenge admin session is a fresh ID.
            $request->session()->regenerate();
            $request->session()->put(EnforceAdminSessionIdleTimeout::SESSION_KEY, time());

            return redirect()->to('/');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
