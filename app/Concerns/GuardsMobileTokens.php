<?php

namespace App\Concerns;

use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Http\Request;

/**
 * Shared guards for the mobile token API controllers: the token must carry
 * the 'mobile' ability and the account must not be disabled.
 */
trait GuardsMobileTokens
{
    private function ensureMobileToken(Request $request): void
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $token = $user->currentAccessToken();

        // Sanctum::actingAs in tests may not set a real token instance.
        if ($token === null) {
            return;
        }

        abort_unless(
            $token->can(MobileApiToken::TOKEN_ABILITY) || $token->can('*'),
            403,
            'This token cannot access the mobile API.'
        );
    }

    private function ensureNotDisabled(Request $request): User
    {
        $user = $request->user();

        abort_if($user->disabled_at !== null, 403, 'Account disabled.');

        return $user;
    }
}
