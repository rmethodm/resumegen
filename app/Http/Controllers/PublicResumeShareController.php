<?php

namespace App\Http\Controllers;

use App\Models\ResumeShareLink;
use App\Support\DocxExport;
use App\Support\PdfFonts;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * The read-only page a recruiter sees when opening a shared link (mockup
 * option 6a's counterpart page — no messaging, no recruiter identity beyond
 * the optional email/password gate). Unauthenticated by design: token in
 * the URL is the credential, matching the rest of the app's "unguessable
 * id" model.
 */
class PublicResumeShareController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        if ($link->isExpired()) {
            return redirect('/');
        }

        $locked = $this->gated($link) && ! $this->unlocked($request, $link);

        return Inertia::render('Resumes/PublicShare', [
            'token' => $token,
            'locked' => $locked,
            'requireEmail' => $link->require_email,
            'requirePassword' => $link->require_password,
            'allowDownload' => $link->allow_download,
            'resume' => $locked ? null : ResumeDocument::toArray($link->resume),
        ]);
    }

    public function unlock(Request $request, string $token): RedirectResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if($link->isExpired(), 404);

        $data = $request->validate(array_filter([
            'email' => $link->require_email ? ['required', 'email'] : null,
            'password' => $link->require_password ? ['required', 'string'] : null,
        ]));

        if ($link->require_password && ! hash_equals((string) $link->password, (string) ($data['password'] ?? ''))) {
            return back()->withErrors(['password' => 'That password is incorrect.']);
        }

        if ($link->require_email) {
            $link->views()->create(['email' => $data['email']]);
        }

        $request->session()->put($this->unlockKey($link), true);

        return back();
    }

    public function pdf(Request $request, string $token): HttpResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if($link->isExpired(), 404);
        abort_unless($link->allow_download, 403);
        abort_unless(! $this->gated($link) || $this->unlocked($request, $link), 403);

        $doc = ResumeDocument::toArray($link->resume);
        $filename = ResumeExport::filename($doc);
        $pdfFont = PdfFonts::resolve($link->resume->font);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->download("{$filename}.pdf");
    }

    public function docx(Request $request, string $token): HttpResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if($link->isExpired(), 404);
        abort_unless($link->allow_download, 403);
        abort_unless(! $this->gated($link) || $this->unlocked($request, $link), 403);

        $doc = ResumeDocument::toArray($link->resume);
        $filename = ResumeExport::filename($doc);

        return response(DocxExport::build($doc), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename=\"{$filename}.docx\"",
        ]);
    }

    private function gated(ResumeShareLink $link): bool
    {
        return $link->require_email || $link->require_password;
    }

    private function unlocked(Request $request, ResumeShareLink $link): bool
    {
        return (bool) $request->session()->get($this->unlockKey($link), false);
    }

    /**
     * Keyed off the current password so rotating it (or turning password
     * protection on) invalidates every session that unlocked under the old
     * one — otherwise editing the password in the modal wouldn't actually
     * revoke access already granted.
     */
    private function unlockKey(ResumeShareLink $link): string
    {
        return "resume_share_unlocked.{$link->token}.".sha1((string) $link->password);
    }
}
