<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorSetup
{
    private array $excluded = [
        'profile.edit',
        'profile.update',
        'two-factor.challenge',
        'two-factor.challenge.store',
        'two-factor.challenge.email',
        'two-factor.enable',
        'two-factor.confirm',
        'two-factor.disable',
        'two-factor.recovery-codes',
        'billing.index',
        'billing.checkout',
        'billing.portal',
        'logout',
        'password.confirm',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->route()->getName(), $this->excluded)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && $user->requiresTwoFactor()) {
            return redirect()->route('profile.edit')
                ->with('error', 'Pro users must enable two-factor authentication to continue.');
        }

        return $next($request);
    }
}
