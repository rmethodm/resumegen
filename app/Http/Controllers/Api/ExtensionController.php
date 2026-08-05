<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Support\ResumeFillProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Token-auth JSON API for the Resumegen Apply browser extension.
 */
class ExtensionController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
        ]);
    }

    public function resumes(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        return response()->json([
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'groups' => ResumeFillProfile::groupsForUser($user->id),
        ]);
    }

    public function fillProfile(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        abort_unless($resume->user_id === $user->id, 404);

        return response()->json(ResumeFillProfile::from($resume));
    }

    private function ensureExtensionToken(Request $request): void
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $token = $user->currentAccessToken();

        // Sanctum::actingAs in tests may not set a real token instance.
        if ($token === null) {
            return;
        }

        abort_unless(
            $token->can(ResumeFillProfile::TOKEN_ABILITY) || $token->can('*'),
            403,
            'This token cannot access the extension API.'
        );
    }
}
