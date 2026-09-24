<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\RecoveryCodeGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TwoFactorRecoveryCodesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Recovery codes only mean something once 2FA is confirmed; minting
        // them for a non-2FA account would just store dead secrets.
        abort_unless($user->hasTwoFactorEnabled(), 404);

        $codes = RecoveryCodeGenerator::generate();
        $user->two_factor_recovery_codes = $codes['hashed'];
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $codes['plain']);
    }
}
