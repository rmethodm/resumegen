<?php

namespace App\Http\Controllers\Api;

use App\Concerns\GuardsMobileTokens;
use App\Http\Controllers\Controller;
use App\Http\Controllers\ResumeShareLinkController;
use App\Http\Requests\UpdateResumeShareLinkRequest;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Token-auth JSON mirror of {@see ResumeShareLinkController}
 * for the iPhone app. Same payload shape, JSON responses instead of redirects.
 */
class ShareLinkController extends Controller
{
    use GuardsMobileTokens;

    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resume->user_id === $user->id, 404);

        $link = $resume->shareLink()
            ->withCount('views')
            ->with(['views' => fn ($query) => $query->latest('id')->limit(50)])
            ->first();

        return response()->json([
            'share' => $link === null ? null : $this->payload($link),
        ]);
    }

    /** Idempotent, like the web modal: creates on first call, returns on repeats. */
    public function store(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resume->user_id === $user->id, 404);

        $link = $resume->shareLink()->firstOrCreate([]);

        return response()->json(
            ['share' => $this->payload($link->loadCount('views'))],
            $link->wasRecentlyCreated ? 201 : 200
        );
    }

    public function update(UpdateResumeShareLinkRequest $request, ResumeShareLink $resumeShareLink): JsonResponse
    {
        $this->ensureMobileToken($request);
        $this->ensureNotDisabled($request);

        $data = $request->validated();

        // Same guard as the web modal: enabling password protection with no
        // password stored and none sent would lock every visitor out.
        if (($data['require_password'] ?? false)
            && blank($data['password'] ?? null)
            && $resumeShareLink->password === null) {
            return response()->json(
                ['errors' => ['password' => ['Provide a password to enable protection.']]],
                422
            );
        }

        // Clearing the stored password while the gate stays on would leave a
        // link nothing can unlock — the hash is gone, so no password matches.
        if (array_key_exists('password', $data)
            && $data['password'] === null
            && ($data['require_password'] ?? $resumeShareLink->require_password)) {
            return response()->json(
                ['errors' => ['password' => ['Disable password protection instead of clearing the password.']]],
                422
            );
        }

        $resumeShareLink->update($data);

        return response()->json([
            'share' => $this->payload($resumeShareLink->fresh()->loadCount('views')),
        ]);
    }

    public function destroy(Request $request, ResumeShareLink $resumeShareLink): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resumeShareLink->resume->user_id === $user->id, 404);

        $resumeShareLink->delete();

        return response()->json(status: 204);
    }

    /**
     * Mirrors the web modal payload; recent views are included only where
     * they were eager-loaded (show), not on store/update.
     *
     * @return array<string, mixed>
     */
    private function payload(ResumeShareLink $link): array
    {
        return [
            'id' => $link->id,
            'url' => route('share.show', $link->token),
            'allow_download' => $link->allow_download,
            'require_email' => $link->require_email,
            'require_password' => $link->require_password,
            // Hashed — the plaintext is only ever known client-side.
            'has_password' => $link->password !== null,
            'expires_at' => $link->expires_at?->toDateString(),
            // Email-gate unlocks only; anonymous ungated views count toward
            // view_count but have no identity to list.
            'views' => $link->relationLoaded('views')
                ? $link->views
                    ->whereNotNull('email')
                    ->values()
                    ->map(fn ($view): array => [
                        'email' => $view->email,
                        'viewed_at' => $view->created_at?->toIso8601String() ?? '',
                    ])
                    ->all()
                : [],
            'view_count' => (int) ($link->views_count ?? 0),
            'is_expired' => $link->isExpired(),
        ];
    }
}
