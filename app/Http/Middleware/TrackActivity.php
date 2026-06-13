<?php

namespace App\Http\Middleware;

use App\Models\UserActivityDay;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackActivity
{
    /**
     * Stamp one activity-day row per authenticated user per day.
     * Session-gated so it writes at most once per day per session.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if ($user && $request->hasSession()) {
            $today = now()->toDateString();

            if ($request->session()->get('activity_stamped') !== $today) {
                UserActivityDay::insertOrIgnore(['user_id' => $user->id, 'activity_date' => $today]);
                $request->session()->put('activity_stamped', $today);
            }
        }

        return $response;
    }
}
