<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeBuilderController extends Controller
{
    /**
     * Legacy list UI — user resumes live on Dashboard; templates on resumes.index.
     * Keep the route so old bookmarks resolve.
     */
    public function index(): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /**
     * Legacy create form — resume creation is on the Dashboard / resumes.store.
     */
    public function create(): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /**
     * Legacy editor — Workstation is the only editing surface.
     * Keep the named route so old links and bookmarks still work.
     */
    public function edit(Request $request, Resume $resume): RedirectResponse
    {
        // Match ResumeController ownership (no ResumePolicy in this app).
        abort_unless($resume->user_id === $request->user()->id, 403);

        return redirect()->route('resumes.workstation', $resume);
    }

    public function shareUrl(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $link = $resume->shareLinks()->latest('id')->first()
            ?? $resume->shareLinks()->create([]);

        return response()->json([
            'url' => route('share.show', $link->token),
        ]);
    }

    /**
     * Legacy PDF download — bookmark redirect to the current export route.
     */
    public function downloadPdf(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return redirect()->route('resumes.download', $resume);
    }

    /**
     * Legacy PDF preview — bookmark redirect to the current inline preview.
     */
    public function previewPdf(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return redirect()->route('resumes.preview', $resume);
    }

    /**
     * Legacy HTML preview — the old resume-pdf view is gone, so this lands
     * on the same inline PDF preview.
     */
    public function htmlPreview(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return redirect()->route('resumes.preview', $resume);
    }
}
