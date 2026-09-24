<?php

namespace App\Http\Controllers;

use App\Actions\CreateResume;
use App\Http\Requests\AiReviewResumeRequest;
use App\Http\Requests\StoreResumeRequest;
use App\Http\Requests\UpdateResumeRequest;
use App\Http\Requests\UpdateResumeTitleRequest;
use App\Models\JobApplication;
use App\Models\LibrarySkill;
use App\Models\Resume;
use App\Models\ResumeNote;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\DocxExport;
use App\Support\PdfExport;
use App\Support\ResumeAnalysis;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class ResumeController extends Controller
{
    /**
     * Resume types catalogue — the Resumes nav destination. Lists every
     * live template so the user can pick one and create a new resume.
     */
    public function index(): Response
    {
        $comingSoon = collect(glob(public_path('resumes/*')))
            ->map(fn (string $path) => [
                'name' => basename($path),
                'url' => asset('resumes/'.basename($path)),
            ])
            ->sortBy('name')
            ->values();

        return Inertia::render('Resumes/Index', [
            'templates' => ResumeDocument::TEMPLATES,
            'comingSoon' => $comingSoon,
        ]);
    }

    /**
     * Create a brand-new resume seeded with a chosen template's visual style
     * (and, optionally, its paired font) — the "Use this template" action on
     * the PDF resume templates showcase. Always its own new group, never a
     * sibling of an existing one. Ownership isn't a concern: it is always
     * the acting user's own new resume.
     */
    public function store(StoreResumeRequest $request, CreateResume $createResume): RedirectResponse
    {
        $resume = $createResume->handle($request->user(), $request->validated());

        return to_route('resumes.workstation', $resume);
    }

    /** The section-rail + form workstation (design direction 3a), the only editor. */
    public function workstation(Request $request, Resume $resume): Response
    {
        return $this->render($request, $resume, 'Resumes/Workstation');
    }

    /** Former NewEditor clone — keep the URL as a bookmark redirect to Workstation. */
    public function builder(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        return to_route('resumes.workstation', $resume);
    }

    public function update(UpdateResumeRequest $request, Resume $resume): RedirectResponse
    {
        // Optimistic concurrency: client sends the updated_at it loaded.
        // A mismatch means another tab (or restore) wrote first.
        $base = $request->input('base_updated_at');
        if (is_string($base) && $base !== '' && $resume->updated_at !== null) {
            $client = strtotime($base);
            $server = $resume->updated_at->getTimestamp();
            if ($client !== false && abs($server - $client) > 1) {
                return back()->withErrors([
                    'conflict' => 'This resume changed in another tab. Reload to keep editing, or retry to overwrite.',
                ]);
            }
        }

        $data = $request->validated();
        unset($data['base_updated_at']);

        ResumeDocument::save($resume, $data);

        // A single-version resume's title *is* the dashboard card's name —
        // keep the group in sync so the rename shows up there too. Once a
        // group has siblings, each version's title is its own thing again
        // (renamed from the dashboard's version tray instead).
        if ($resume->group->resumes()->count() === 1) {
            $resume->group->update(['title' => $resume->title]);
        }

        return back()->with('updated_at', $resume->fresh()->updated_at?->toIso8601String());
    }

    /**
     * Inline PDF stream for the workstation iframe (A2). Same render as
     * download, Content-Disposition inline so the browser embeds it.
     */
    public function preview(Request $request, Resume $resume): HttpResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        return PdfExport::for($resume)->stream();
    }

    /**
     * Rename one version — title only. Deliberately not routed through
     * update()/ResumeDocument::save(), which rewrites the whole document and
     * deletes its child rows; renaming a sibling from the dropdown carries only
     * its title, not its document. Ownership 404s, matching the rest of the app.
     */
    public function rename(UpdateResumeTitleRequest $request, Resume $resume): RedirectResponse
    {
        $resume->update($request->validated());

        return back();
    }

    /**
     * Delete one version. The group's base version (its lowest resume ID)
     * can never be deleted through this route — a real 403, not the app's
     * usual existence-hiding 404: the row is visibly there on the dashboard
     * with the action disabled, so there is no existence to protect.
     */
    public function destroy(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        abort_if($resume->id === $resume->group->resumes()->min('id'), 403);

        $resume->delete();

        return to_route('dashboard');
    }

    /**
     * Duplicate a resume as a new version in the same group. The whole
     * document (contact, sections, design) round-trips through ResumeDocument.
     * import_state is left at its default on purpose — a copy starts fresh.
     * Ownership 404s.
     */
    public function duplicate(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $document = ResumeDocument::toArray($resume);
        $document['title'] = $resume->title.' (copy)';

        $copy = DB::transaction(function () use ($request, $resume, $document): Resume {
            $copy = $request->user()->resumes()->create([
                'title' => $document['title'],
                'group_id' => $resume->group_id,
            ]);

            ResumeDocument::save($copy, $document);

            return $copy;
        });

        return to_route('resumes.workstation', $copy);
    }

    /**
     * Download the resume as a PDF. Ownership 404s rather than 403s,
     * matching the rest of the app.
     */
    public function download(Request $request, Resume $resume): HttpResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        return PdfExport::for($resume)->download();
    }

    /**
     * Download the resume as a .docx. Ownership 404s rather than 403s,
     * matching the rest of the app.
     */
    public function downloadDocx(Request $request, Resume $resume): HttpResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $doc = ResumeDocument::toArray($resume);
        $filename = ResumeExport::filename($doc);

        return response(DocxExport::build($doc), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename=\"{$filename}.docx\"",
        ]);
    }

    public function aiReview(AiReviewResumeRequest $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        $preset = $request->validated('preset');

        if ($preset === 'tailor_jd' && trim((string) $resume->target_job_description) === '') {
            return response()->json(['message' => 'Paste a job description first.'], 422);
        }

        $cost = (int) config('ai.costs.resume_review');

        $debit = $limiter->reserve($user, $cost, 'resume_review');

        if (is_int($debit)) {
            $message = $debit === 429 ? 'AI access is blocked.' : 'Subscription or AI credits required.';

            return response()->json(['message' => $message], $debit);
        }

        try {
            $result = $ai->reviewResume($user, ResumeDocument::toArray($resume), $resume->target_job_description, $preset);
        } catch (Throwable $e) {
            $credits->refund($debit);
            Context::add(['ai_feature' => 'resume_review', 'ai_user_id' => $user->id]);
            report($e);

            return response()->json(['message' => 'AI review failed.'], 502);
        }

        $credits->attachRequest($debit, $result['ai_request_id']);

        $resume->ai_review = $result['suggestions'];
        $resume->ai_review_generated_at = now();
        $resume->ai_review_preset = $preset;
        $resume->save();

        return response()->json([
            'suggestions' => $result['suggestions'],
            'generated_at' => $resume->ai_review_generated_at->toIso8601String(),
            'preset' => $preset,
            'credits_remaining' => $credits->balance($user),
        ]);
    }

    private function render(Request $request, Resume $resume, string $component): Response
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $resume->load([
            'notes',
            'snapshots' => fn ($query) => $query->select(['id', 'resume_id', 'label', 'created_at'])->latest('id')->limit(20),
            'shareLink' => fn ($query) => $query->withCount('views'),
            // Filter in SQL: anonymous views would otherwise crowd email rows
            // out of the 50-row window.
            'shareLink.views' => fn ($query) => $query->whereNotNull('email')->latest('id')->limit(50),
            'group.resumes' => fn ($query) => $query->with(['experiences', 'skills'])->withCount('notes'),
        ]);

        $shareLink = $resume->shareLink;
        $viewCount = (int) ($shareLink?->views_count ?? 0);

        $document = ResumeDocument::toArray($resume);
        // Concurrency token for C11 — not part of the document schema.
        $document['updated_at'] = $resume->updated_at?->toIso8601String();
        // Cached AI review — Workstation-only, not part of the public share document.
        $document['ai_review'] = $resume->ai_review;
        $document['ai_review_generated_at'] = $resume->ai_review_generated_at?->toIso8601String();
        $document['ai_review_preset'] = $resume->ai_review_preset;

        // Newest linked Kanban card, if any. One resume can be attached to
        // several cards from the Kanban's edit form; the chip shows one.
        $application = JobApplication::query()
            ->where('user_id', $request->user()->id)
            ->where('resume_id', $resume->id)
            ->latest('id')
            ->first();

        return Inertia::render($component, [
            'resume' => $document,
            'application' => $application === null ? null : [
                'id' => $application->id,
                'company' => $application->company,
                'role' => $application->role,
                'status' => $application->status,
                'job_url' => $application->job_url,
                'job_description' => $application->job_description,
            ],
            'analysis' => [
                'score' => ResumeAnalysis::score($resume),
                'breakdown' => ResumeAnalysis::breakdown($resume),
                'suggestions' => ResumeAnalysis::suggestions($resume),
            ],
            'skillLibrary' => LibrarySkill::catalogue(),
            'group' => [
                'id' => $resume->group_id,
                'title' => $resume->group->title,
            ],
            // One row per version in this group, current first via the id order
            // on ResumeGroup::resumes(). Score is the same general score shown
            // in the header badge, computed per sibling.
            'versions' => $resume->group->resumes
                ->map(fn (Resume $version): array => [
                    'id' => $version->id,
                    'title' => $version->title,
                    'score' => ResumeAnalysis::score($version),
                    'is_current' => $version->id === $resume->id,
                    'has_notes' => $version->notes_count > 0,
                ])->all(),
            // Private per-version reminders. Its own prop, not part of the
            // document — ResumeDocument never learns about notes.
            'notes' => $resume->notes->map(fn (ResumeNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'x' => $note->x,
                'y' => $note->y,
                'width' => $note->width,
                'height' => $note->height,
                'created_at' => $note->created_at->diffForHumans(),
            ])->all(),
            'snapshots' => $resume->snapshots->map(fn ($snapshot): array => [
                'id' => $snapshot->id,
                'label' => $snapshot->label,
                'created_at' => $snapshot->created_at?->toIso8601String(),
                'created_at_human' => $snapshot->created_at?->diffForHumans(),
            ])->all(),
            // Share modal (design doc turn 6, option 6a). Null until Maya
            // opens the modal for the first time and one is generated.
            'share' => $shareLink ? [
                'id' => $shareLink->id,
                'url' => route('share.show', $shareLink->token),
                'allow_download' => $shareLink->allow_download,
                'require_email' => $shareLink->require_email,
                'require_password' => $shareLink->require_password,
                // Hashed — the plaintext is only ever known client-side.
                'has_password' => $shareLink->password !== null,
                'expires_at' => $shareLink->expires_at?->toDateString(),
                // Email-gate unlocks only; anonymous ungated views count
                // toward view_count but have no identity to list.
                'views' => $shareLink->views
                    ->map(fn ($view): array => [
                        'email' => $view->email,
                        'viewed_at' => $view->created_at?->toIso8601String() ?? '',
                    ])
                    ->all(),
                'view_count' => $viewCount,
            ] : null,
        ]);
    }
}
