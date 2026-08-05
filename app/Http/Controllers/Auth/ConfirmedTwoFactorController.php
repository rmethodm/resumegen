<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\RecoveryCodeGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class ConfirmedTwoFactorController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $user = $request->user();
        $google2fa = new Google2FA;

        if (! $google2fa->verifyKey($user->two_factor_secret, $request->input('code'))) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        $codes = RecoveryCodeGenerator::generate();

        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = $codes['hashed'];
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $codes['plain']);
    }
}
