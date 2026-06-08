<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrgAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! Organization::where('owner_id', $request->user()->id)->exists()) {
            abort(403);
        }

        return $next($request);
    }
}
