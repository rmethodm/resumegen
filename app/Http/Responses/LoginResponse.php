<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            $request->session()->put('two_factor_auth_pending', true);

            return redirect()->route('two-factor.challenge');
        }

        $adminDomain = config('app.admin_domain');
        if (
            $user->isAdmin()
            && is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain
        ) {
            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
