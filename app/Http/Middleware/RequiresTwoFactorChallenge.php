<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiresTwoFactorChallenge
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('two-factor.challenge');
        }

        return $next($request);
    }
}
