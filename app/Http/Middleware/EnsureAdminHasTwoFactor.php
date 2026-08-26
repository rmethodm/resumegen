<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminHasTwoFactor
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->isAdmin() && ! $user->hasTwoFactorEnabled()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $profileUrl = rtrim((string) config('app.url'), '/').'/profile';

            return redirect()
                ->to('/login')
                ->with('error', 'Admin accounts require two-factor authentication. Enable it at '.$profileUrl.', then sign in here again.');
        }

        return $next($request);
    }
}
