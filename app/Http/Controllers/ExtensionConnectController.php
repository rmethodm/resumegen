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
        $newToken = $request->user()->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        );

        return response()->json(['token' => $newToken->plainTextToken]);
    }
}
