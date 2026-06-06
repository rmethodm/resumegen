<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TwoFactorRecoveryCodesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $plainCodes = [];
        $hashedCodes = [];

        for ($i = 0; $i < 8; $i++) {
            $plain = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5))
                .'-'
                .strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5));
            $plainCodes[] = $plain;
            $hashedCodes[] = bcrypt($plain);
        }

        $user = $request->user();
        $user->two_factor_recovery_codes = $hashedCodes;
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $plainCodes);
    }
}
