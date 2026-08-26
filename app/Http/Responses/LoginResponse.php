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

        $adminDomain = config('app.admin_domain');
        $onAdminHost = is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain;

        if ($user->hasTwoFactorEnabled()) {
            $request->session()->put('two_factor_auth_pending', true);

            if ($onAdminHost) {
                $request->session()->put('url.intended', url('/'));
            }

            return redirect()->route('two-factor.challenge');
        }

        if ($onAdminHost) {
            if (! $user->isAdmin()) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()
                    ->to('/login')
                    ->with('error', 'This account does not have admin access.');
            }

            // Password-only admins are not allowed on the support panel.
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $profileUrl = rtrim((string) config('app.url'), '/').'/profile';

            return redirect()
                ->to('/login')
                ->with('error', 'Admin accounts require two-factor authentication. Enable it at '.$profileUrl.', then sign in here again.');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
