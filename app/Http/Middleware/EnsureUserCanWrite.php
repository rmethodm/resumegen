<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks every data-changing request for read-only (demo) accounts.
 * GET/HEAD/OPTIONS pass; the only allowed writes are the ones that end
 * the session itself, so a read-only user can still log out.
 */
class EnsureUserCanWrite
{
    private const ALLOWED_ROUTES = ['logout', 'api.auth.token.destroy'];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user !== null
            && $user->isReadOnly()
            && ! $request->isMethodSafe()
            && ! in_array($request->route()?->getName(), self::ALLOWED_ROUTES, true)
        ) {
            if ($request->expectsJson()) {
                abort(403, 'This demo account is read-only.');
            }

            return redirect()
                ->back()
                ->with('error', 'This demo account is read-only — changes are not saved.');
        }

        return $next($request);
    }
}
