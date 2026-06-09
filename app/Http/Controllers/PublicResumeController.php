<?php

namespace App\Http\Controllers;

use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Services\DocxGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

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

        $resume = $link->resume;
        $contact = $resume->contact ?? [];
        $fullName = $contact['full_name'] ?? $resume->name;
        $title = $contact['title'] ?? '';

        $og = [
            'title' => $fullName.' — Resume',
            'description' => trim(($title ? $title.' · ' : '').$resume->name),
            'url' => route('public.resume', $token),
            'image' => route('public.og-image', $token),
        ];

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $resume,
            'token' => $token,
        ])->withViewData(['og' => $og]);
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

        return $pdf->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function downloadDocx(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $resume = $link->resume;
        $word = app(DocxGenerator::class)->generate($resume);
        $filename = $resume->name
            ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resume->name).'.docx'
            : $resume->id.'.docx';

        return response()->streamDownload(function () use ($word) {
            $word->save('php://output');
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    }
}
