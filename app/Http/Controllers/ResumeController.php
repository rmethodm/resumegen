<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResumeRequest;
use App\Http\Requests\UpdateResumeRequest;
use App\Http\Requests\UpdateResumeTitleRequest;
use App\Models\LibrarySkill;
use App\Models\Resume;
use App\Models\ResumeNote;
use App\Models\StarterProfile;
use App\Support\DocxExport;
use App\Support\PdfFonts;
use App\Support\PlainTextResumeParser;
use App\Support\ResumeAnalysis;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use App\Support\RoleSamples;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ResumeController extends Controller
{
    /**
     * Entry point for the builder: open the most recent resume, creating a
     * starter one on first visit so the editor never opens on a blank page.
     */
    public function index(Request $request): RedirectResponse
    {
        $user = $request->user();

        // First visit with nothing to open and no seed to copy from: send them
        // to set up a starter profile instead of opening a blank editor. The
        // intake page offers Skip, so this is a nudge, not a gate.
        if ($user->resumes()->doesntExist() && $user->starterProfile()->doesntExist()) {
            return to_route('starter-profile.edit');
        }

        $resume = $user->resumes()->latest()->first()
            ?? $this->createStarterResume($request);

        return to_route('resumes.workstation', $resume);
    }

    /**
     * Create a brand-new resume seeded with a chosen template's visual style
     * (and, optionally, its paired font) — the "Use this template" action on
     * the PDF resume templates showcase. Always its own new group, never a
     * sibling of an existing one. Ownership isn't a concern: it is always
     * the acting user's own new resume.
     */
    public function store(StoreResumeRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $sampleId = $validated['sample'] ?? null;
        $plainText = isset($validated['plain_text']) ? trim((string) $validated['plain_text']) : '';

        // Role sample or paste import: seed full document (contact from sample/parse).
        if (is_string($sampleId) && $sampleId !== '') {
            $sample = RoleSamples::find($sampleId);
            abort_unless($sample !== null, 422);

            $contact = $this->starterProfileContactFields($request);
            $document = array_merge($sample['document'], [
                'full_name' => $contact['full_name'] !== '' ? $contact['full_name'] : ($sample['document']['full_name'] ?? 'Your Name'),
                'email' => $contact['email'] !== '' ? $contact['email'] : ($sample['document']['email'] ?? ''),
                'phone' => $contact['phone'] !== '' ? $contact['phone'] : '',
                'location' => $contact['location'] !== '' ? $contact['location'] : '',
                'linkedin' => $contact['linkedin'] !== '' ? $contact['linkedin'] : '',
                'website' => $contact['website'] !== '' ? $contact['website'] : '',
                'template' => $validated['template'] ?? ($sample['document']['template'] ?? 'ats-plain'),
                'font' => $validated['font'] ?? 'inter',
            ]);

            $resume = DB::transaction(function () use ($request, $document, $sample): Resume {
                $resume = $request->user()->resumes()->create([
                    'title' => $document['title'] ?? $sample['label'],
                ]);
                ResumeDocument::save($resume, $document);

                return $resume;
            });

            return to_route('resumes.workstation', $resume->fresh());
        }

        if ($plainText !== '') {
            $parsed = PlainTextResumeParser::parse($plainText);
            $contact = $this->starterProfileContactFields($request);
            $document = array_merge($parsed, [
                'full_name' => ($parsed['full_name'] ?? '') !== ''
                    ? $parsed['full_name']
                    : $contact['full_name'],
                'email' => ($parsed['email'] ?? '') !== ''
                    ? $parsed['email']
                    : $contact['email'],
                'phone' => ($parsed['phone'] ?? '') !== ''
                    ? $parsed['phone']
                    : $contact['phone'],
                'location' => ($parsed['location'] ?? '') !== ''
                    ? $parsed['location']
                    : $contact['location'],
                'linkedin' => ($parsed['linkedin'] ?? '') !== ''
                    ? $parsed['linkedin']
                    : $contact['linkedin'],
                'website' => ($parsed['website'] ?? '') !== ''
                    ? $parsed['website']
                    : $contact['website'],
                'template' => $validated['template'] ?? 'ats-plain',
                'font' => $validated['font'] ?? 'inter',
            ]);

            $resume = DB::transaction(function () use ($request, $document): Resume {
                $resume = $request->user()->resumes()->create([
                    'title' => $document['title'] ?? 'Imported resume',
                ]);
                ResumeDocument::save($resume, $document);

                return $resume;
            });

            return to_route('resumes.workstation', $resume->fresh());
        }

        $resume = DB::transaction(function () use ($request, $validated): Resume {
            $resume = $request->user()->resumes()->create(array_filter([
                'title' => 'Untitled resume',
                'template' => $validated['template'] ?? null,
                'font' => $validated['font'] ?? null,
                ...$this->starterProfileContactFields($request),
            ], fn (mixed $value): bool => $value !== null));

            $this->seedExperiencesAndSkills($resume, $request->user()->starterProfile);

            return $resume;
        });

        return to_route('resumes.workstation', $resume);
    }

    /** The section-rail + form workstation (design direction 3a), the only editor. */
    public function workstation(Request $request, Resume $resume): Response
    {
        return $this->render($request, $resume, 'Resumes/Workstation');
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

        $doc = ResumeDocument::toArray($resume);
        $filename = ResumeExport::filename($doc);
        $pdfFont = PdfFonts::resolve($resume->font);
        PdfFonts::ensureInstalled($pdfFont);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->setPaper('letter')->stream("{$filename}.pdf");
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

        $doc = ResumeDocument::toArray($resume);
        $filename = ResumeExport::filename($doc);
        $pdfFont = PdfFonts::resolve($resume->font);
        PdfFonts::ensureInstalled($pdfFont);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->setPaper('letter')->download("{$filename}.pdf");
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

    private function render(Request $request, Resume $resume, string $component): Response
    {
        abort_unless($resume->user_id === $request->user()->id, 404);

        $resume->load([
            'notes',
            'snapshots' => fn ($query) => $query->latest('id')->limit(20),
            'shareLink.views' => fn ($query) => $query->latest('id')->limit(50),
            'group.resumes' => fn ($query) => $query->with(['experiences', 'skills'])->withCount('notes'),
        ]);

        $shareLink = $resume->shareLink;
        $viewCount = $shareLink !== null
            ? (int) $shareLink->views()->count()
            : 0;

        $document = ResumeDocument::toArray($resume);
        // Concurrency token for C11 — not part of the document schema.
        $document['updated_at'] = $resume->updated_at?->toIso8601String();

        return Inertia::render($component, [
            'resume' => $document,
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
                'password' => $shareLink->password,
                'expires_at' => $shareLink->expires_at?->toDateString(),
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

    /** @return array<string, string> */
    private function starterProfileContactFields(Request $request): array
    {
        $profile = $request->user()->starterProfile;

        return [
            'full_name' => $profile?->full_name ?: $request->user()->name,
            'headline' => $profile?->headline ?? '',
            'email' => $profile?->email ?: $request->user()->email,
            'phone' => $profile?->phone ?? '',
            'location' => $profile?->location ?? '',
            'target_role' => $profile?->target_role ?? '',
            'linkedin' => $profile?->linkedin ?? '',
            'website' => $profile?->website ?? '',
        ];
    }

    private function createStarterResume(Request $request): Resume
    {
        $profile = $request->user()->starterProfile;

        return DB::transaction(function () use ($request, $profile): Resume {
            $resume = $request->user()->resumes()->create([
                'title' => 'Untitled resume',
                ...$this->starterProfileContactFields($request),
            ]);

            $this->seedExperiencesAndSkills($resume, $profile);

            return $resume;
        });
    }

    /**
     * With a profile, seed its experience snapshot and skills; without one,
     * keep the old single empty experience row so the editor never opens on
     * nothing. Shared by every path that creates a resume from scratch.
     */
    private function seedExperiencesAndSkills(Resume $resume, ?StarterProfile $profile): void
    {
        $experiences = $profile?->experience_snapshot ?? [];

        if ($profile === null) {
            $resume->experiences()->create(['position' => 0, 'bullets' => []]);
        } else {
            foreach (array_values($experiences) as $index => $experience) {
                $resume->experiences()->create([
                    'position' => $index,
                    'title' => $experience['title'] ?? '',
                    'company' => $experience['company'] ?? '',
                    'start_date' => $experience['start_date'] ?? '',
                    'end_date' => $experience['end_date'] ?? '',
                    'is_current' => (bool) ($experience['is_current'] ?? false),
                    'bullets' => array_values(array_filter(
                        $experience['bullets'] ?? [],
                        fn (mixed $line): bool => is_string($line) && trim($line) !== '',
                    )),
                ]);
            }
        }

        foreach (array_values($profile?->skills ?? []) as $index => $skill) {
            $resume->skills()->create([
                'position' => $index,
                'category' => $skill['category'] ?? '',
                'name' => $skill['name'],
            ]);
        }
    }
}
