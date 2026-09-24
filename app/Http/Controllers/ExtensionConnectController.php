<?php

namespace App\Http\Controllers;

use App\Support\ResumeFillProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * One-click extension connect (Phase C, 2026-09-14 extension upgrade spec):
 * the extension opens this page in an already-authenticated browser tab,
 * which mints a token and hands it back via chrome.runtime.sendMessage
 * (manifest externally_connectable). Paste-token Settings flow stays as
 * the fallback for browsers where messaging isn't available.
 */
class ExtensionConnectController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Auth/ExtensionConnect', [
            'extensionId' => config('services.resumegen_extension.id'),
        ]);
    }

    public function issueToken(Request $request): JsonResponse
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

        return response()->json(['token' => $newToken->plainTextToken]);
    }
}
