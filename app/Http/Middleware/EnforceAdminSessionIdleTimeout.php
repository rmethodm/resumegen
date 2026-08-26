<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceAdminSessionIdleTimeout
{
    public const SESSION_KEY = 'admin_last_activity_at';

    /**
     * Invalidate idle authenticated sessions on the admin host only.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->onAdminHost($request) || $request->user() === null) {
            return $next($request);
        }

        $lifetimeMinutes = max(1, (int) config('app.admin_session_lifetime', 60));
        $lastActivity = (int) $request->session()->get(self::SESSION_KEY, 0);
        $now = time();

        if ($lastActivity > 0 && ($now - $lastActivity) > ($lifetimeMinutes * 60)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->to('/login')
                ->with('error', 'Your admin session expired due to inactivity. Please sign in again.');
        }

        $request->session()->put(self::SESSION_KEY, $now);

        return $next($request);
    }

    private function onAdminHost(Request $request): bool
    {
        $adminDomain = config('app.admin_domain');

        return is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain;
    }
}
