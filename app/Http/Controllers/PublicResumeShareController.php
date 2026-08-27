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
use Illuminate\Support\Facades\Hash;
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

        if (! $locked) {
            $this->logView($request, $link);
        }

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

        if ($link->require_password && ! Hash::check((string) ($data['password'] ?? ''), (string) $link->password)) {
            return back()->withErrors(['password' => 'That password is incorrect.']);
        }

        if ($link->require_email) {
            $link->views()->create([
                'email' => $data['email'],
                'ip_hash' => $this->ipHash($request),
            ]);
            // The unlock IS this session's view — show() must not add an
            // anonymous row on the redirect back.
            $request->session()->put($this->viewedKey($link), true);
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

        $this->logView($request, $link);

        $doc = ResumeDocument::toArray($link->resume);
        $filename = ResumeExport::filename($doc);
        $pdfFont = PdfFonts::resolve($link->resume->font);
        PdfFonts::ensureInstalled($pdfFont);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->setPaper('letter')->download("{$filename}.pdf");
    }

    public function docx(Request $request, string $token): HttpResponse
    {
        $link = ResumeShareLink::where('token', $token)->firstOrFail();

        abort_if($link->isExpired(), 404);
        abort_unless($link->allow_download, 403);
        abort_unless(! $this->gated($link) || $this->unlocked($request, $link), 403);

        $this->logView($request, $link);

        $doc = ResumeDocument::toArray($link->resume);
        $filename = ResumeExport::filename($doc);

        return response(DocxExport::build($doc), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename=\"{$filename}.docx\"",
        ]);
    }

    /**
     * One anonymous view row per session per link, so /shares counts ungated
     * visitors too (email-gated unlocks log their own row with the email).
     */
    private function logView(Request $request, ResumeShareLink $link): void
    {
        if ($request->session()->get($this->viewedKey($link), false)) {
            return;
        }

        // Cookieless clients (curl, scripts) get a fresh session every hit,
        // so the flag above never dedupes them — without the IP-per-day
        // check below they could flood the append-only views table and
        // inflate the owner's counts.
        $ipHash = $this->ipHash($request);

        $alreadyLoggedToday = $link->views()
            ->where('ip_hash', $ipHash)
            ->where('created_at', '>=', now()->startOfDay())
            ->exists();

        if (! $alreadyLoggedToday) {
            $link->views()->create(['email' => null, 'ip_hash' => $ipHash]);
        }

        $request->session()->put($this->viewedKey($link), true);
    }

    /**
     * Keyed hash so the append-only analytics table never stores raw IPs.
     */
    private function ipHash(Request $request): string
    {
        return hash('sha256', $request->ip().'|'.config('app.key'));
    }

    private function viewedKey(ResumeShareLink $link): string
    {
        return "resume_share_viewed.{$link->token}";
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
     * Keyed off the current password *hash* so rotating or changing the
     * password invalidates every session that unlocked under the old one —
     * bcrypt salts make every set produce a new hash, so the key always
     * changes even if the same plaintext is re-entered.
     */
    private function unlockKey(ResumeShareLink $link): string
    {
        return "resume_share_unlocked.{$link->token}.".sha1((string) $link->password);
    }
}
