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
        $codes = RecoveryCodeGenerator::generate();

        $user = $request->user();
        $user->two_factor_recovery_codes = $codes['hashed'];
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $codes['plain']);
    }
}
