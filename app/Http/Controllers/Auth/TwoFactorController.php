<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $google2fa = new Google2FA;
        $user = $request->user();

        // Re-enrolling while 2FA is active would null two_factor_confirmed_at,
        // silently disabling 2FA without the password gate on the disable route.
        if ($user->two_factor_confirmed_at !== null) {
            return redirect()
                ->route('profile.edit')
                ->with('error', 'Disable two-factor authentication before setting it up again.');
        }

        $user->two_factor_secret = $google2fa->generateSecretKey();
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }
}
