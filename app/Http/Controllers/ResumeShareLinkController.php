<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateResumeShareLinkRequest;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * The Share modal's backing endpoints (Maya's side). Ownership 404s
 * throughout, matching the rest of the app.
 */
class ResumeShareLinkController extends Controller
{
    /**
     * Full share payload for the modal (password + recent views). The dashboard
     * list only ships a badge; open the modal and this fills the detail.
     */
    public function show(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $link = $resume->shareLink()
            ->withCount('views')
            ->with(['views' => fn ($query) => $query->latest('id')->limit(50)])
            ->first();

        return response()->json([
            'share' => $link === null ? null : $this->modalPayload($link),
        ]);
    }

    /**
     * Idempotent: opening the Share modal always has a link to show, so this
     * creates one on first use and simply returns on repeat calls.
     */
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $resume->shareLink()->firstOrCreate([]);

        return back();
    }

    public function update(UpdateResumeShareLinkRequest $request, ResumeShareLink $resumeShareLink): RedirectResponse
    {
        $data = $request->validated();

        // Turning password protection on for the first time needs something
        // to show in the modal's textbox — generate it rather than making
        // the owner think of one.
        if (($data['require_password'] ?? $resumeShareLink->require_password)
            && blank($data['password'] ?? $resumeShareLink->password)) {
            $data['password'] = Str::random(8);
        }

        $resumeShareLink->update($data);

        return back();
    }

    public function destroy(Request $request, ResumeShareLink $resumeShareLink): RedirectResponse
    {
        abort_unless($resumeShareLink->resume->user_id === $request->user()->id, 404);

        $resumeShareLink->delete();

        return back();
    }

    /**
     * @return array{
     *     id: int,
     *     url: string,
     *     allow_download: bool,
     *     require_email: bool,
     *     require_password: bool,
     *     password: string|null,
     *     expires_at: string|null,
     *     views: list<array{email: string, viewed_at: string}>,
     *     view_count: int,
     *     is_expired: bool
     * }
     */
    private function modalPayload(ResumeShareLink $link): array
    {
        return [
            'id' => $link->id,
            'url' => route('share.show', $link->token),
            'allow_download' => $link->allow_download,
            'require_email' => $link->require_email,
            'require_password' => $link->require_password,
            'password' => $link->password,
            'expires_at' => $link->expires_at?->toDateString(),
            'views' => $link->views
                ->map(fn ($view): array => [
                    'email' => $view->email,
                    'viewed_at' => $view->created_at?->toIso8601String() ?? '',
                ])
                ->all(),
            'view_count' => (int) ($link->views_count ?? $link->views->count()),
            'is_expired' => $link->isExpired(),
        ];
    }
}
