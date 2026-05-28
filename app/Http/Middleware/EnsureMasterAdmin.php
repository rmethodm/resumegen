<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMasterAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_master_admin) {
            abort(403);
        }

        return $next($request);
    }
}
