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
        $onAdminHost = is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain;

        if ($onAdminHost) {
            if (! $user->isAdmin()) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()
                    ->to('/login')
                    ->with('error', 'This account does not have admin access.');
            }

            // Stay on the admin host root (admin.dashboard). Avoid intended()
            // so a leftover product /dashboard URL cannot win.
            return redirect()->to('/');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
