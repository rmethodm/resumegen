<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateResumeShareLinkRequest;
use App\Models\Resume;
use App\Models\ResumeShareLink;
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
}
