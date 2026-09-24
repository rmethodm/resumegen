<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Events\ShouldBeDiscovered;

/**
 * Every login of a 2FA user starts a pending-challenge session — not just
 * the paths that go through LoginResponse. A session restored from the
 * remember-me cookie fires Login too, and without this it would skip the
 * challenge entirely.
 */
class RequireTwoFactorChallengeOnLogin implements ShouldBeDiscovered
{
    /**
     * Registered explicitly in AppServiceProvider — skip auto-discovery.
     */
    public static function shouldBeDiscovered(): bool
    {
        return false;
    }

    public function handle(Login $event): void
    {
        if (! $event->user instanceof User || ! $event->user->hasTwoFactorEnabled()) {
            return;
        }

        $request = request();

        if (! $request->hasSession()) {
            return;
        }

        $request->session()->put('two_factor_auth_pending', true);
    }
}
