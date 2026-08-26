<?php

namespace App\Http\Middleware;

use App\Support\AdminDestructiveGate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminDestructiveToolsAllowed
{
    /**
     * Require ADMIN_DESTRUCTIVE_TOOLS and a recent password confirmation.
     *
     * Redirects to url('/confirm-password') on the current host so admin
     * sessions are not bounced onto the product APP_URL.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $deny = AdminDestructiveGate::denyResponse($request);

        if ($deny !== null) {
            return $deny;
        }

        return $next($request);
    }
}
