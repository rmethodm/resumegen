<?php

namespace App\Http\Middleware;

use App\Models\SiteVisit;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TrackSiteVisit
{
    /**
     * Log one row per request to the main site. Admin-domain traffic is
     * excluded — this tracks visitors, not admin staff. Best-effort: logging
     * must never break the request it's observing.
     */
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    /**
     * Route names whose path contains a secret (reset/verification token,
     * share link token) — never persisted, since the admin visitor log
     * would otherwise leak a still-valid credential.
     */
    private const SENSITIVE_ROUTE_PREFIXES = ['password.', 'verification.', 'share.'];

    public function terminate(Request $request): void
    {
        if ($request->getHost() === config('app.admin_domain')) {
            return;
        }

        $routeName = $request->route()?->getName();

        foreach (self::SENSITIVE_ROUTE_PREFIXES as $prefix) {
            if ($routeName !== null && str_starts_with($routeName, $prefix)) {
                return;
            }
        }

        try {
            SiteVisit::create([
                'user_id' => $request->user()?->id,
                'session_id' => $request->hasSession()
                    ? hash_hmac('sha256', $request->session()->getId(), config('app.key'))
                    : null,
                'method' => $request->method(),
                'path' => '/'.ltrim($request->path(), '/'),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'referrer' => $request->headers->get('referer'),
            ]);
        } catch (Throwable) {
            // best-effort — never let visitor logging break a request
        }
    }
}
