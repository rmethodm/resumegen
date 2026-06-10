<?php

namespace App\Actions;

use App\Models\User;

class EnsureReferralCode
{
    public static function for(User $user): string
    {
        if ($user->referral_code !== null) {
            return $user->referral_code;
        }

        $code = strtoupper(bin2hex(random_bytes(6)));
        $user->forceFill(['referral_code' => $code])->saveQuietly();
        $user->referral_code = $code;

        return $code;
    }
}
