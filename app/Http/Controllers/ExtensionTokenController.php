<?php

namespace App\Http\Controllers;

use App\Support\ResumeFillProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Session-auth token management for the Resumegen Apply extension.
 * Plaintext token is shown once via session flash — never stored again.
 */
class ExtensionTokenController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $newToken = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        );

        return redirect()
            ->route('profile.edit')
            ->with('extension_token_plain', $newToken->plainTextToken)
            ->with('status', 'extension-token-created');
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
            ->with('status', 'extension-token-revoked');
    }
}
