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

        // Each connect/paste mints a token; keep the newest 5 extension
        // tokens (a few browsers) so the table can't grow forever.
        $user->tokens()
            ->where('name', ResumeFillProfile::TOKEN_NAME)
            ->orderByDesc('id')
            ->skip(5)
            ->take(PHP_INT_MAX)
            ->get()
            ->each
            ->delete();

        return redirect()
            ->route('profile.edit')
            ->with('extension_token_plain', $newToken->plainTextToken)
            ->with('status', 'extension-token-created');
    }

    public function destroy(Request $request, PersonalAccessToken $token): RedirectResponse
    {
        abort_unless(
            (int) $token->tokenable_id === (int) $request->user()->id
            && $token->tokenable_type === $request->user()->getMorphClass()
            // Only extension tokens are revocable here — mobile tokens have their own flow.
            && $token->name === ResumeFillProfile::TOKEN_NAME,
            404
        );

        $token->delete();

        return redirect()
            ->route('profile.edit')
            ->with('status', 'extension-token-revoked');
    }
}
