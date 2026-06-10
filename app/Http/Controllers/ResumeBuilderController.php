<?php

namespace App\Http\Controllers;

use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
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
            ->with(['tags:id,resume_id,label,color', 'linkedJob:id,role,company'])
            ->orderByDesc('updated_at')
            ->get();

        $viewCounts = ResumeShareEvent::query()
            ->where('event', 'page_view')
            ->whereIn('resume_id', $resumeCollection->pluck('id'))
            ->selectRaw('resume_id, COUNT(*) as cnt')
            ->groupBy('resume_id')
            ->pluck('cnt', 'resume_id');

        $activeShareResumeIds = ResumeShareLink::where('is_active', true)
            ->whereIn('resume_id', $resumeCollection->pluck('id'))
            ->pluck('resume_id')
            ->flip();

        $resumes = $resumeCollection->map(function (Resume $resume) use ($viewCounts, $activeShareResumeIds) {
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
                'has_active_share_link' => isset($activeShareResumeIds[$resume->id]),
                'job_application_id' => $resume->job_application_id,
                'linked_job' => $resume->linkedJob
                    ? ['id' => $resume->linkedJob->id, 'role' => $resume->linkedJob->role, 'company' => $resume->linkedJob->company]
                    : null,
            ];
        });

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
            'resumeCount' => $resumes->count(),
            'resumeLimit' => UserLimits::resumeLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'userPersona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
            ],
            'jobApplications' => $user->jobApplications()
                ->orderByDesc('updated_at')
                ->get(['id', 'role', 'company']),
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

        $resume->load(['shareLinks', 'threads']);

        $threads = $resume->threads->map(fn ($t) => [
            'id' => $t->id,
            'sender_name' => $t->sender_name,
            'sender_email' => $t->sender_email,
            'is_read' => $t->is_read,
            'created_at' => $t->created_at->toDateTimeString(),
        ]);

        $user = $request->user();
        $isFirstResume = ! $user->has_completed_onboarding
            && $user->resumes()->count() === 1;

        return Inertia::render('ResumeBuilder/Edit', [
            'resume' => $resume,
            'shareLinks' => $resume->shareLinks,
            'threads' => $threads,
            'isFirstResume' => $isFirstResume,
            'canDocx' => UserLimits::canDocx($user),
            'customSectionLimit' => UserLimits::customSectionLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'completionScore' => $this->computeCompletionScore($resume),
            'strengthHistoryEnabled' => UserLimits::canStrengthHistory($user),
            'photoUrl' => $resume->getFirstMediaUrl('photo') ?: null,
            'userPersona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
            ],
            'recruiterNote' => $this->getRecruiterNote($request->user(), $resume),
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
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline'],
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

    public function linkJob(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'job_application_id' => ['nullable', 'integer'],
        ]);

        if ($validated['job_application_id'] !== null) {
            $owns = $request->user()
                ->jobApplications()
                ->whereKey($validated['job_application_id'])
                ->exists();
            abort_if(! $owns, 403);
        }

        $resume->update(['job_application_id' => $validated['job_application_id']]);

        return back();
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

    private function getRecruiterNote(User $user, Resume $resume): ?string
    {
        $orgId = OrganizationMember::where('user_id', $user->id)
            ->where('role', 'member')
            ->whereNotNull('joined_at')
            ->value('organization_id');

        if (! $orgId) {
            return null;
        }

        return RecruiterNote::where('organization_id', $orgId)
            ->where('resume_id', $resume->id)
            ->value('body');
    }
}
