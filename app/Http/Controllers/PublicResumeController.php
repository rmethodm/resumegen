<?php
namespace App\Http\Controllers;

use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicResumeController extends Controller
{
    public function show(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        if (! $link->is_active || ($link->expires_at && $link->expires_at->isPast())) {
            return Inertia::render('ResumeBuilder/LinkExpired', [
                'reason' => ! $link->is_active ? 'deactivated' : 'expired',
            ])->toResponse($request)->setStatusCode(410);
        }

        ResumeShareEvent::log($request, $link, 'page_view');

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $link->resume,
            'token'  => $token,
        ]);
    }

    public function downloadPdf(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $resume = $link->resume;
        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])->setPaper('letter', 'portrait');

        ResumeShareEvent::log($request, $link, 'pdf_download');

        return $pdf->download($resume->pdf_filename ?? ($resume->id . '.pdf'));
    }

    public function storeQuestion(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $validated = $request->validate([
            'sender_name'  => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'sender_phone' => ['nullable', 'string', 'max:30'],
            'message'      => ['required', 'string', 'max:2000'],
        ]);

        $link->questions()->create([
            ...$validated,
            'resume_id' => $link->resume_id,
        ]);

        ResumeShareEvent::log($request, $link, 'question_submitted');

        return back()->with('questionSubmitted', true);
    }
}
