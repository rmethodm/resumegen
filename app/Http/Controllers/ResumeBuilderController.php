<?php

namespace App\Http\Controllers;

use App\Data\ResumeRules;
use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeBuilderController extends Controller
{
    /**
     * Legacy list UI — user resumes live on Dashboard; templates on resumes.index.
     * Keep the route so old bookmarks resolve.
     */
    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /**
     * Legacy create form — resume creation is on the Dashboard / resumes.store.
     */
    public function create(Request $request): RedirectResponse
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

        return redirect()->route('resumes.builder', $resume);
    }

    public function update(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $validated = $request->validate(ResumeRules::rules());

        $resume->update($validated);

        return back();
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

    public function destroy(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        $resume->delete();

        return redirect()->route('dashboard');
    }

    public function downloadPdf(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return $this->buildPdf($resume)->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function previewPdf(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return $this->buildPdf($resume)->stream('preview.pdf');
    }

    public function htmlPreview(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return response(view('resume-pdf', ['resume' => $resume])->render())
            ->header('Content-Type', 'text/html');
    }

    private function buildPdf(Resume $resume): \Barryvdh\DomPDF\PDF
    {
        return Pdf::loadView('resume-pdf', [
            'resume' => $resume,
            'watermark' => false,
        ])->setPaper('letter', 'portrait');
    }

    public function beacon(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $data = json_decode($request->getContent(), true) ?? [];

        $validated = validator($data, ResumeRules::rules())->validate();

        $resume->update($validated);

        return response()->noContent();
    }
}
