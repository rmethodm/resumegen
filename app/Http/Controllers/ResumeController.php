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
use App\Support\ResumeAnalysis;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $resume = $request->user()->resumes()->create(array_filter([
            'title' => 'Untitled resume',
            'template' => $request->validated('template'),
            'font' => $request->validated('font'),
            ...$this->starterProfileContactFields($request),
        ], fn (mixed $value): bool => $value !== null));

        $this->seedExperiencesAndSkills($resume, $request->user()->starterProfile);

        return to_route('resumes.workstation', $resume);
    }

    /** The section-rail + form workstation (design direction 3a), the only editor. */
    public function workstation(Request $request, Resume $resume): Response
    {
        return $this->render($request, $resume, 'Resumes/Workstation');
    }

    public function update(UpdateResumeRequest $request, Resume $resume): RedirectResponse
    {
        ResumeDocument::save($resume, $request->validated());

        // A single-version resume's title *is* the dashboard card's name —
        // keep the group in sync so the rename shows up there too. Once a
        // group has siblings, each version's title is its own thing again
        // (renamed from the dashboard's version tray instead).
        if ($resume->group->resumes()->count() === 1) {
            $resume->group->update(['title' => $resume->title]);
        }

        return back();
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

        $copy = $request->user()->resumes()->create([
            'title' => $document['title'],
            'group_id' => $resume->group_id,
        ]);

        ResumeDocument::save($copy, $document);

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

        // dompdf only ships the core PostScript fonts, so the eleven UI
        // faces collapse to serif or sans — the closest honest mapping.
        $serif = in_array($resume->font, ['georgia', 'garamond', 'cambria', 'times'], true);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'font' => $serif ? 'serif' : 'sans-serif',
        ])->download("{$filename}.pdf");
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

        return Inertia::render($component, [
            'resume' => ResumeDocument::toArray($resume),
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
            'versions' => $resume->group->resumes()
                ->with(['experiences', 'skills'])
                ->withCount('notes')
                ->get()
                ->map(fn (Resume $version): array => [
                    'id' => $version->id,
                    'title' => $version->title,
                    'score' => ResumeAnalysis::score($version),
                    'is_current' => $version->id === $resume->id,
                    'has_notes' => $version->notes_count > 0,
                ])->all(),
            // Private per-version reminders on the canvas. Its own prop, not
            // part of the document — ResumeDocument never learns about notes.
            'notes' => $resume->notes->map(fn (ResumeNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'x' => $note->x,
                'y' => $note->y,
                'width' => $note->width,
                'height' => $note->height,
                'created_at' => $note->created_at->diffForHumans(),
            ])->all(),
            // Share modal (design doc turn 6, option 6a). Null until Maya
            // opens the modal for the first time and one is generated.
            'share' => $resume->shareLink ? [
                'id' => $resume->shareLink->id,
                'url' => route('share.show', $resume->shareLink->token),
                'allow_download' => $resume->shareLink->allow_download,
                'require_email' => $resume->shareLink->require_email,
                'require_password' => $resume->shareLink->require_password,
                'password' => $resume->shareLink->password,
                'expires_at' => $resume->shareLink->expires_at?->toDateString(),
            ] : null,
        ]);
    }

    /** @return array<string, string> */
    private function starterProfileContactFields(Request $request): array
    {
        $profile = $request->user()->starterProfile;

        return [
            'full_name' => $profile->full_name ?? $request->user()->name,
            'headline' => $profile?->headline ?? '',
            'email' => $profile->email ?? $request->user()->email,
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

        $resume = $request->user()->resumes()->create([
            'title' => 'Untitled resume',
            ...$this->starterProfileContactFields($request),
        ]);

        $this->seedExperiencesAndSkills($resume, $profile);

        return $resume;
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
