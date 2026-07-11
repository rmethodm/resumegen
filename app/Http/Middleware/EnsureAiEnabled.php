<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks every AI-backed route while `ai.enabled` is false.
 *
 * 404 rather than 403: a suspended feature should look absent, not forbidden,
 * so no client mistakes it for a plan restriction and offers an upgrade.
 */
class EnsureAiEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(! config('ai.enabled'), 404);

        return $next($request);
    }
}
