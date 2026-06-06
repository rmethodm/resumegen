<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\TwoFactorCodeMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'emailSent' => session('two_factor_email_sent', false),
        ]);
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
                return redirect()->intended(route('dashboard'))
                    ->with('error', 'You have fewer than 2 recovery codes left — regenerate them in your profile.');
            }

            return redirect()->intended(route('dashboard'));
        }

        // Email OTP path
        $cachedOtp = Cache::get('2fa_email_otp_'.$user->id);
        if ($cachedOtp && $code === $cachedOtp) {
            Cache::forget('2fa_email_otp_'.$user->id);
            $request->session()->forget('two_factor_auth_pending');

            return redirect()->intended(route('dashboard'));
        }

        // TOTP path
        $google2fa = new Google2FA;
        $valid = $google2fa->verifyKey($user->two_factor_secret, $code);

        if (! $valid) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        $request->session()->forget('two_factor_auth_pending');

        return redirect()->intended(route('dashboard'));
    }

    public function sendEmail(Request $request): RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        $user = $request->user();
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put('2fa_email_otp_'.$user->id, $otp, now()->addMinutes(10));

        Mail::to($user->email)->send(new TwoFactorCodeMail($otp));

        return redirect()->route('two-factor.challenge')
            ->with('two_factor_email_sent', true);
    }
}
