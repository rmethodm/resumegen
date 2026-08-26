<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;

class AdminDestructiveGate
{
    /**
     * @return JsonResponse|RedirectResponse|null Null when the request may proceed.
     */
    public static function denyResponse(Request $request): JsonResponse|RedirectResponse|null
    {
        if (! (bool) config('app.admin_destructive_tools')) {
            if (self::wantsJson($request)) {
                return response()->json(['message' => 'Destructive admin tools are disabled.'], 403);
            }

            abort(403, 'Destructive admin tools are disabled.');
        }

        if (self::passwordConfirmedRecently($request)) {
            return null;
        }

        if (self::wantsJson($request)) {
            return response()->json(['message' => 'Password confirmation required.'], 423);
        }

        $request->session()->put('url.intended', $request->fullUrl());

        return redirect()->guest(url('/confirm-password'));
    }

    public static function passwordConfirmedRecently(Request $request): bool
    {
        $confirmedAt = Date::now()->unix() - $request->session()->get('auth.password_confirmed_at', 0);
        $timeout = (int) config('auth.password_timeout', 10800);

        return $confirmedAt <= $timeout;
    }

    private static function wantsJson(Request $request): bool
    {
        return $request->expectsJson() || $request->isJson();
    }
}
