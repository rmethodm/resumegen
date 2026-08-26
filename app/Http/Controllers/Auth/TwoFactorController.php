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

        $user->two_factor_secret = $google2fa->generateSecretKey();
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return redirect()
                ->route('profile.edit')
                ->with('error', 'Admin accounts cannot disable two-factor authentication.');
        }

        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }
}
