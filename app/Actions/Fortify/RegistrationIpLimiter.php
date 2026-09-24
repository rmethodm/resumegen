<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * Shared "5 accounts / IP / 24h" velocity gate, used by both password
 * registration (CreateNewUser) and OAuth registration (SocialiteController)
 * so OAuth sign-up can't bypass the same limit.
 */
class RegistrationIpLimiter
{
    /**
     * Run $create only if the IP is under its limit. The count and the insert
     * happen under one per-IP lock, so a burst of parallel sign-ups cannot all
     * read "4 so far" before any of them commits.
     *
     * @param  Closure(): User  $create
     */
    public static function create(string $ip, Closure $create): User
    {
        return Cache::lock('registration-ip:'.$ip, 10)->block(5, function () use ($ip, $create): User {
            if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
                throw ValidationException::withMessages([
                    'registration' => 'Too many accounts created from this IP. Please try again tomorrow.',
                ]);
            }

            return $create();
        });
    }
}
