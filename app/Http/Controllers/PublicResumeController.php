<?php

namespace App\Http\Controllers;

use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Services\DocxGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class PublicResumeController extends Controller
{
    public function show(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        if (! $link->is_active || ($link->expires_at && $link->expires_at->isPast())) {
            return Inertia::render('ResumeBuilder/LinkExpired', [
                'reason' => ! $link->is_active ? 'deactivated' : 'expired',
            ])->toResponse($request)->setStatusCode(410);
        }

        if ($this->isLocked($request, $link)) {
            return Inertia::render('ResumeBuilder/LinkPassword', [
                'token' => $token,
                'label' => $link->label,
            ]);
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

        $threads = ResumeThread::where('resume_id', $resume->id)
            ->with(['messages' => fn ($q) => $q->orderBy('created_at')])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'sender_name' => $t->sender_name,
                'created_at' => $t->created_at->toDateTimeString(),
                'messages' => $t->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'is_owner' => $m->is_owner,
                    'created_at' => $m->created_at->toDateTimeString(),
                ]),
            ]);

        $ownedThreadIds = $request->session()->get('owned_threads', []);
        $ownerName = ($resume->contact['full_name'] ?? null) ?: $resume->name;

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $resume,
            'token' => $token,
            'threads' => $threads,
            'ownerName' => $ownerName,
            'ownedThreadIds' => $ownedThreadIds,
        ])->withViewData(['og' => $og]);
    }

    /**
     * A password-protected link stays locked until this session has unlocked it.
     */
    private function isLocked(Request $request, ResumeShareLink $link): bool
    {
        return $link->password_hash !== null
            && ! in_array($link->id, $request->session()->get('unlocked_links', []), true);
    }

    public function unlock(Request $request, string $token): RedirectResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        $password = (string) $request->input('password');

        if (! $link->password_hash || ! Hash::check($password, $link->password_hash)) {
            return back()->withErrors(['password' => 'That password is not correct.']);
        }

        $request->session()->push('unlocked_links', $link->id);

        return redirect()->route('public.resume', $token);
    }

    public function downloadPdf(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        abort_if($this->isLocked($request, $link), 403, 'This link is password protected.');

        $resume = $link->resume;
        $pdf = Pdf::loadView('resume-pdf', [
            'resume' => $resume,
            'watermark' => false,
        ])->setPaper('letter', 'portrait');

        ResumeShareEvent::log($request, $link, 'pdf_download');

        return $pdf->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function downloadDocx(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        abort_if($this->isLocked($request, $link), 403, 'This link is password protected.');

        $resume = $link->resume;

        $word = app(DocxGenerator::class)->generate($resume);

        ResumeShareEvent::log($request, $link, 'docx_download');

        $filename = $resume->name
            ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resume->name).'.docx'
            : $resume->id.'.docx';

        return response()->streamDownload(function () use ($word) {
            $word->save('php://output');
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    }
}
