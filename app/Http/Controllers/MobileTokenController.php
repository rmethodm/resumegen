<?php

namespace App\Http\Controllers;

use App\Support\MobileApiToken;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Session-auth token management for the iPhone app, parallel to
 * {@see ExtensionTokenController}. Plaintext token is shown once via
 * session flash — never stored again.
 */
class MobileTokenController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $newToken = $user->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        );

        return redirect()
            ->route('profile.edit')
            ->with('mobile_token_plain', $newToken->plainTextToken)
            ->with('status', 'mobile-token-created');
    }

    public function destroy(Request $request, PersonalAccessToken $token): RedirectResponse
    {
        abort_unless(
            (int) $token->tokenable_id === (int) $request->user()->id
            && $token->tokenable_type === $request->user()->getMorphClass(),
            404
        );

        $token->delete();

        return redirect()
            ->route('profile.edit')
            ->with('status', 'mobile-token-revoked');
    }
}
