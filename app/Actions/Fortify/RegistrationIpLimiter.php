<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Shared "5 accounts / IP / 24h" velocity gate, used by both password
 * registration (CreateNewUser) and OAuth registration (SocialiteController)
 * so OAuth sign-up can't bypass the same limit.
 */
class RegistrationIpLimiter
{
    public static function assertNotThrottled(string $ip): void
    {
        if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
            throw ValidationException::withMessages([
                'registration' => 'Too many accounts created from this IP. Please try again tomorrow.',
            ]);
        }
    }
}
