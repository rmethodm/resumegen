<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Password login for the iPhone/iPad apps — issues a Sanctum token with the
 * 'mobile' ability, named so it shows up (and can be revoked) in the
 * Profile page's mobile-token list alongside web-issued ones.
 */
class MobileAuthController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        abort_if($user->disabled_at !== null, 403, 'Account disabled.');
        abort_unless($user->hasVerifiedEmail(), 403, 'Verify your email address first.');

        // Password-only login would silently bypass 2FA — those accounts
        // create their token from the Profile page on the web instead.
        abort_if(
            $user->two_factor_secret !== null && $user->two_factor_confirmed_at !== null,
            403,
            'This account uses two-factor authentication. Create a mobile token from your Profile on the web.'
        );

        $token = $user->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        );

        return response()->json(['token' => $token->plainTextToken], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        // ponytail: revokes only the token that made this call — "log out
        // everywhere" stays a Profile-page action.
        $request->user()->currentAccessToken()?->delete();

        return response()->json(status: 204);
    }
}
