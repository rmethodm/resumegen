<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Services\DocxGenerator;
use App\Services\ResumeStrengthScorer;
use App\Services\UserLimits;
use App\Services\WebhookDispatcher;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpWord\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResumeBuilderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resumeCollection = $user->resumes()
            ->where('is_snapshot', false)
            ->with('tags:id,resume_id,label,color')
            ->orderByDesc('updated_at')
            ->get();

        $viewCounts = ResumeShareEvent::query()
            ->where('event', 'page_view')
            ->whereIn('resume_id', $resumeCollection->pluck('id'))
            ->selectRaw('resume_id, COUNT(*) as cnt')
            ->groupBy('resume_id')
            ->pluck('cnt', 'resume_id');

        $masterIds = $resumeCollection->pluck('master_resume_id')->filter()->unique();
        $masterUpdatedAts = $masterIds->isNotEmpty()
            ? Resume::whereIn('id', $masterIds)->pluck('updated_at', 'id')
            : collect();

        $activeShareResumeIds = ResumeShareLink::where('is_active', true)
            ->whereIn('resume_id', $resumeCollection->pluck('id'))
            ->pluck('resume_id')
            ->flip();

        $resumes = $resumeCollection->map(function (Resume $resume) use ($viewCounts, $masterUpdatedAts, $activeShareResumeIds) {
            $strength = ResumeStrengthScorer::score($resume);

            return [
                'id' => $resume->id,
                'name' => $resume->name,
                'pdf_filename' => $resume->pdf_filename,
                'updated_at' => $resume->updated_at,
                'strength' => $strength['score'],
                'strength_tip' => $strength['tip'],
                'view_count' => (int) ($viewCounts[$resume->id] ?? 0),
                'ab_parent_id' => $resume->ab_parent_id,
                'tags' => $resume->tags->map(fn ($t) => [
                    'id' => $t->id,
                    'label' => $t->label,
                    'color' => $t->color,
                ])->values()->all(),
                'is_master' => $resume->is_master,
                'master_resume_id' => $resume->master_resume_id,
                'master_updated_at' => $resume->master_resume_id
                    ? optional($masterUpdatedAts->get($resume->master_resume_id))?->toISOString()
                    : null,
                'master_synced_at' => $resume->master_synced_at?->toISOString(),
                'has_active_share_link' => isset($activeShareResumeIds[$resume->id]),
            ];
        });

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
            'resumeCount' => $resumes->count(),
            'resumeLimit' => UserLimits::resumeLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'canPdfImport' => UserLimits::canPdfImport($user),
            'canGenerate' => UserLimits::canGenerate($user),
            'userPersona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resume_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $name = $validated['name'] ?? ($user->target_role ? $user->target_role.' Resume' : 'My Resume');

        $resume = $user->resumes()->create([
            'name' => $name,
            'pdf_filename' => Str::uuid().'.pdf',
        ]);

        if ($user->profile) {
            $resume->update(['contact' => $user->profile]);
        }

        WebhookDispatcher::dispatch($user, 'resume.created', ['id' => $resume->id, 'name' => $resume->name]);

        return redirect()->route('builder.edit', $resume->id);
    }

    public function edit(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $resume->load(['shareLinks', 'questions.shareLink']);

        $questions = $resume->questions->map(fn ($q) => [
            'id' => $q->id,
            'sender_name' => $q->sender_name,
            'sender_email' => $q->sender_email,
            'sender_phone' => $q->sender_phone,
            'message' => $q->message,
            'is_read' => $q->is_read,
            'link_label' => $q->shareLink?->label ?? '(unlabelled)',
            'created_at' => $q->created_at->toDateTimeString(),
        ]);

        $user = $request->user();
        $isFirstResume = ! $user->has_completed_onboarding
            && $user->resumes()->count() === 1;

        $masterOutOfSync = false;
        $masterResume = null;
        if ($resume->master_resume_id) {
            $master = $resume->masterResume;
            if ($master) {
                $masterResume = ['id' => $master->id, 'name' => $master->name];
                $masterOutOfSync = $resume->master_synced_at === null
                    || $master->updated_at->gt($resume->master_synced_at);
            }
        }

        return Inertia::render('ResumeBuilder/Edit', [
            'resume' => $resume,
            'shareLinks' => $resume->shareLinks,
            'questions' => $questions,
            'isFirstResume' => $isFirstResume,
            'aiCapabilities' => [
                'claude' => ! empty(config('services.anthropic.key')),
                'openai' => ! empty(config('services.openai.key')),
            ],
            'canAts' => UserLimits::canAts($user),
            'atsUsesRemaining' => UserLimits::atsUsesRemaining($user),
            'canInterviewCoach' => UserLimits::canInterviewCoach($user),
            'interviewCoachUsesRemaining' => UserLimits::interviewCoachUsesRemaining($user),
            'canDocx' => UserLimits::canDocx($user),
            'canTailor' => UserLimits::canTailor($user),
            'canQuantifyBullet' => UserLimits::canQuantifyBullet($user),
            'quantifyBulletUsesRemaining' => UserLimits::quantifyBulletUsesRemaining($user),
            'canCareerPaths' => UserLimits::canCareerPaths($user),
            'canMockInterview' => $user->planTier() === 'pro',
            'aiUsed' => UserLimits::aiUsageThisPeriod($user),
            'aiLimit' => UserLimits::aiLimit($user),
            'customSectionLimit' => UserLimits::customSectionLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'completionScore' => $this->computeCompletionScore($resume),
            'snapshots' => $resume->snapshots()->get(['id', 'name', 'created_at'])->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'created_at' => $s->created_at->toDateString(),
            ]),
            'strengthHistoryEnabled' => UserLimits::canStrengthHistory($user),
            'photoUrl' => $resume->getFirstMediaUrl('photo') ?: null,
            'userPersona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
            ],
            'masterOutOfSync' => $masterOutOfSync,
            'masterResume' => $masterResume,
        ]);
    }

    public function update(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate(self::resumeRules());

        if (isset($validated['custom_sections'])) {
            $limit = UserLimits::customSectionLimit($request->user());
            if ($limit !== null && count($validated['custom_sections']) > $limit) {
                return back()->with('featureGate', [
                    'feature' => 'custom_sections',
                    'requiredTier' => 'starter',
                    'message' => "Free accounts are limited to {$limit} custom sections.",
                ]);
            }
        }

        if (isset($validated['template'])) {
            $allowed = UserLimits::allowedTemplates($request->user());
            if (! in_array($validated['template'], $allowed, true)) {
                return back()->with('featureGate', [
                    'feature' => 'template_access',
                    'requiredTier' => 'starter',
                ]);
            }
        }

        $resume->update($validated);

        WebhookDispatcher::dispatch($request->user(), 'resume.updated', ['id' => $resume->id, 'name' => $resume->name]);

        return back();
    }

    private function computeCompletionScore(Resume $resume): int
    {
        $score = 0;
        $c = $resume->contact ?? [];

        if (! empty($c['full_name'])) {
            $score += 8;
        }
        if (! empty($c['email'])) {
            $score += 8;
        }
        if (! empty($c['phone'])) {
            $score += 5;
        }
        if (! empty($c['location'])) {
            $score += 5;
        }
        if (! empty($c['title'])) {
            $score += 5;
        }

        if (! empty($resume->summary) && strlen($resume->summary) >= 50) {
            $score += 20;
        }

        $exp = $resume->experience ?? [];
        if (count($exp) > 0) {
            $score += 15;
        }
        if (count(array_filter($exp, fn ($e) => ! empty($e['bullets']))) > 0) {
            $score += 5;
        }

        if (count($resume->education ?? []) > 0) {
            $score += 12;
        }
        if (count($resume->skills ?? []) > 0) {
            $score += 7;
        }
        if (count($resume->certifications ?? []) > 0) {
            $score += 5;
        }

        // Photo bonus for photo-supporting templates
        if (in_array($resume->template ?? 'classic', ['sidebar', 'creative', 'executive'])) {
            if ($resume->getFirstMediaUrl('photo')) {
                $score += 5;
            }
        }

        return min(100, $score);
    }

    private static function resumeRules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline,two-column'],
            'accent_color' => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family' => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary' => ['nullable', 'string'],
            'contact' => ['nullable', 'array'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'skills' => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'font_sizes' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'custom_sections' => ['nullable', 'array'],
        ];
    }

    public function shareUrl(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $link = $resume->shareLinks()->where('is_active', true)->first();

        if (! $link) {
            $link = $resume->shareLinks()->create(['is_active' => true]);
        }

        return response()->json([
            'url' => route('public.resume', $link->token),
        ]);
    }

    public function saveVersion(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        abort_if($resume->is_snapshot, 422, 'Cannot version a snapshot.');

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $snapshotName = $validated['name']
            ?? $resume->name.' — '.now()->format('M j, Y');

        $snapshot = $resume->replicate(['id', 'created_at', 'updated_at']);
        $snapshot->name = $snapshotName;
        $snapshot->parent_resume_id = $resume->id;
        $snapshot->is_snapshot = true;
        $snapshot->pdf_filename = Str::uuid().'.pdf';
        $snapshot->save();

        return back()->with('versionSaved', $snapshotName);
    }

    public function destroy(Request $request, Resume $resume)
    {
        $this->authorize('delete', $resume);
        $resume->delete();

        return redirect()->route('builder.index');
    }

    public function downloadPdf(Resume $resume)
    {
        $this->authorize('update', $resume);

        return $this->buildPdf($resume)->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function downloadDocx(Resume $resume): StreamedResponse|RedirectResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canDocx(auth()->user())) {
            return back()->with('featureGate', [
                'feature' => 'docx_export',
                'requiredTier' => 'starter',
            ]);
        }

        $word = app(DocxGenerator::class)->generate($resume);

        $filename = $resume->name
            ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resume->name).'.docx'
            : $resume->id.'.docx';

        return response()->stream(function () use ($word) {
            $writer = IOFactory::createWriter($word, 'Word2007');
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function previewPdf(Resume $resume)
    {
        $this->authorize('update', $resume);

        return $this->buildPdf($resume)->stream('preview.pdf');
    }

    private function buildPdf(Resume $resume): \Barryvdh\DomPDF\PDF
    {
        return Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait');
    }

    public function beacon(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $data = json_decode($request->getContent(), true) ?? [];

        $validated = validator($data, self::resumeRules())->validate();

        if (isset($validated['custom_sections'])) {
            $limit = UserLimits::customSectionLimit($request->user());
            if ($limit !== null && count($validated['custom_sections']) > $limit) {
                return response()->noContent();
            }
        }

        $resume->update($validated);

        return response()->noContent();
    }

    public function createVariant(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $variant = $resume->replicate();
        $variant->name = $resume->name.' (Variant)';
        $variant->ab_parent_id = $resume->id;
        $variant->save();

        return redirect()->route('builder.edit', $variant->id);
    }

    public function setMaster(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $resume->update(['is_master' => ! $resume->is_master]);

        return back();
    }

    public function createTailoredCopy(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $user = $resume->user;
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resume_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $copy = $resume->replicate();
        $copy->name = $resume->name.' (Tailored)';
        $copy->master_resume_id = $resume->id;
        $copy->master_synced_at = now();
        $copy->is_master = false;
        $copy->is_snapshot = false;
        $copy->ab_parent_id = null;
        $copy->pdf_filename = Str::uuid().'.pdf';
        $copy->save();

        return redirect()->route('builder.edit', $copy->id);
    }

    public function syncMaster(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $resume->update(['master_synced_at' => now()]);

        return back();
    }

    public function pullFromMaster(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $master = $resume->masterResume;
        if (! $master) {
            return back()->withErrors(['master' => 'No master resume linked.']);
        }

        $resume->update([
            'contact' => $master->contact,
            'summary' => $master->summary,
            'experience' => $master->experience,
            'education' => $master->education,
            'skills' => $master->skills,
            'certifications' => $master->certifications,
            'font_family' => $master->font_family,
            'accent_color' => $master->accent_color,
            'template' => $master->template,
            'font_sizes' => $master->font_sizes,
            'master_synced_at' => now(),
        ]);

        return back();
    }

    public function abCompare(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $parentId = $resume->ab_parent_id ?? $resume->id;
        $group = Resume::where('id', $parentId)
            ->orWhere('ab_parent_id', $parentId)
            ->where('user_id', $request->user()->id)
            ->get(['id', 'name', 'ab_parent_id']);

        $resumes = $group->map(function (Resume $r): array {
            $events = ResumeShareEvent::where('resume_id', $r->id);

            return [
                'id' => $r->id,
                'name' => $r->name,
                'ab_parent_id' => $r->ab_parent_id,
                'view_count' => (clone $events)->where('event', 'page_view')->count(),
                'unique_visitors' => (clone $events)->where('event', 'page_view')
                    ->selectRaw('COUNT(DISTINCT ip_hash || DATE(created_at)) as cnt')
                    ->value('cnt') ?? 0,
                'pdf_downloads' => (clone $events)->where('event', 'pdf_download')->count(),
                'questions_submitted' => (clone $events)->where('event', 'question_submitted')->count(),
            ];
        });

        return Inertia::render('ResumeBuilder/AbCompare', [
            'resumes' => $resumes,
            'resumeId' => $resume->id,
        ]);
    }

    public function compare(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $otherId = $request->query('with');
        if (! $otherId) {
            abort(404);
        }

        $other = Resume::findOrFail($otherId);
        $this->authorize('update', $other);

        $fields = ['id', 'name', 'contact', 'summary', 'experience', 'education',
            'skills', 'certifications', 'custom_sections', 'template', 'updated_at'];

        return Inertia::render('ResumeBuilder/Compare', [
            'resume' => $resume->only($fields),
            'other' => $other->only($fields),
        ]);
    }

    public function duplicate(Resume $resume)
    {
        $this->authorize('update', $resume);

        $user = $resume->user;
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resume_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $copy = $user->resumes()->create([
            'name' => 'Copy of '.$resume->name,
            'pdf_filename' => Str::uuid().'.pdf',
            'template' => $resume->template,
            'accent_color' => $resume->accent_color,
            'font_family' => $resume->font_family,
            'summary' => $resume->summary,
            'contact' => $resume->contact,
            'experience' => $resume->experience,
            'education' => $resume->education,
            'skills' => $resume->skills,
            'certifications' => $resume->certifications,
            'font_sizes' => $resume->font_sizes,
            'custom_sections' => $resume->custom_sections,
            'section_order' => $resume->section_order,
        ]);

        return redirect()->route('builder.edit', $copy->id);
    }
}
