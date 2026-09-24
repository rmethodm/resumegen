<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Appended globally to the web group (bootstrap/app.php): a pending-2FA
 * session is a real authenticated session, so enforcement must be
 * deny-by-default. Only the routes needed to complete or abandon the
 * challenge are allowed through.
 */
class RequiresTwoFactorChallenge
{
    private const ALLOWED_ROUTES = [
        'two-factor.challenge',
        'two-factor.challenge.store',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Resolve the user before reading the flag: a remember-me cookie is
        // only turned into a session (firing Login, which sets the flag) when
        // the guard is first asked, and that must happen before this check.
        $request->user();

        if ($request->session()->get('two_factor_auth_pending')
            && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            return redirect()->route('two-factor.challenge');
        }

        return $next($request);
    }
}
