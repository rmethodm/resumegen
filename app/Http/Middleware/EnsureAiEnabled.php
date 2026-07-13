<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks every AI-backed route while `ai.enabled` is false.
 *
 * An optional feature key gates a single feature on top of the master switch, so a
 * feature can stay dark while the rest of AI is live (`ai_enabled:career_coach`).
 *
 * 404 rather than 403: a suspended feature should look absent, not forbidden,
 * so no client mistakes it for a plan restriction and offers an upgrade.
 */
class EnsureAiEnabled
{
    public function handle(Request $request, Closure $next, ?string $feature = null): Response
    {
        abort_if(! config('ai.enabled'), 404);
        abort_if($feature !== null && ! config("ai.features.{$feature}"), 404);

        return $next($request);
    }
}
