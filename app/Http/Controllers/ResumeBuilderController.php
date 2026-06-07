<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\DocxGenerator;
use App\Services\ResumeStrengthScorer;
use App\Services\UserLimits;
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
        $resumes = $user->resumes()
            ->where('is_snapshot', false)
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (Resume $resume) {
                $strength = ResumeStrengthScorer::score($resume);

                return [
                    'id' => $resume->id,
                    'name' => $resume->name,
                    'pdf_filename' => $resume->pdf_filename,
                    'updated_at' => $resume->updated_at,
                    'strength' => $strength['score'],
                    'strength_tip' => $strength['tip'],
                ];
            });

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
            'resumeCount' => $resumes->count(),
            'resumeLimit' => UserLimits::resumeLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'canPdfImport' => UserLimits::canPdfImport($user),
            'canGenerate' => UserLimits::canGenerate($user),
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
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $user->resumes()->create([
            'name' => $validated['name'],
            'pdf_filename' => Str::uuid().'.pdf',
        ]);

        if ($user->profile) {
            $resume->update(['contact' => $user->profile]);
        }

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
            'aiUsed' => UserLimits::aiUsageThisPeriod($user),
            'aiLimit' => UserLimits::aiLimit($user),
            'customSectionLimit' => UserLimits::customSectionLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'snapshots' => $resume->snapshots()->get(['id', 'name', 'created_at'])->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'created_at' => $s->created_at->toDateString(),
            ]),
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

        return back();
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
