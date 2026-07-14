<?php

namespace App\Http\Controllers;

use App\Data\ResumeRules;
use App\Data\SkillCategories;
use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Services\DocxGenerator;
use App\Services\ResumeCompletionScorer;
use App\Services\ResumeCopier;
use App\Services\ResumeStrengthScorer;
use App\Services\ResumeThumbnailGenerator;
use App\Services\UserLimits;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
            ->nonSnapshot()
            ->with(['tags:id,resume_id,label,color'])
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
            $cacheKey = "strength:{$resume->id}:".$resume->updated_at->timestamp;
            $strength = cache()->remember($cacheKey, now()->addMinutes(5), fn () => ResumeStrengthScorer::score($resume));

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
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->nonSnapshot()->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resume_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $name = $validated['name'] ?? ($user->target_role ? $user->target_role.' Resume' : 'My Resume');

        $attributes = [
            'name' => $name,
            'pdf_filename' => Str::uuid().'.pdf',
        ];

        if ($user->preferred_template && in_array($user->preferred_template, UserLimits::allowedTemplates($user), true)) {
            $attributes['template'] = $user->preferred_template;
        }

        $resume = $user->resumes()->create($attributes);

        if ($user->profile) {
            $resume->update(['contact' => $user->profile]);
        }

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
            'canAiTailoring' => UserLimits::canAiTailoring($user),
            'canViewStrengthDetail' => UserLimits::canViewStrengthDetail($user),
            'canInterviewCoach' => UserLimits::canInterviewCoach($user),
            'interviewCoachUsesRemaining' => UserLimits::interviewCoachUsesRemaining($user),
            'aiRemaining' => UserLimits::aiRemaining($user),
            'aiCanUpgrade' => UserLimits::aiCanUpgrade($user),
            'aiNextTier' => UserLimits::aiNextTier($user),
            'customSectionLimit' => UserLimits::customSectionLimit($user),
            'allowedTemplates' => UserLimits::allowedTemplates($user),
            'completionScore' => ResumeCompletionScorer::score($resume),
            'skillCategoryOptions' => SkillCategories::labels(),
            'photoUrl' => $resume->getFirstMediaUrl('photo') ?: null,
            'userPersona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
            ],
            'recruiterNote' => null,
            'isFreeTier' => $user->planTier() === 'free',
        ]);
    }

    public function update(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate(ResumeRules::rules());

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
            // Grandfather the resume's existing template so a tier change never bounces a saved selection.
            if ($validated['template'] !== $resume->template && ! in_array($validated['template'], $allowed, true)) {
                return back()->with('featureGate', [
                    'feature' => 'template_access',
                    'requiredTier' => 'starter',
                ]);
            }
        }

        $resume->update($validated);

        return back();
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

    public function downloadDocx(Request $request, Resume $resume): StreamedResponse|RedirectResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canDocx($request->user())) {
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

    public function htmlPreview(Resume $resume)
    {
        $this->authorize('update', $resume);

        return response(view('resume-pdf', ['resume' => $resume])->render())
            ->header('Content-Type', 'text/html');
    }

    public function thumbnail(Resume $resume, ResumeThumbnailGenerator $generator)
    {
        $this->authorize('update', $resume);

        $path = storage_path("app/thumbnails/{$resume->id}.png");
        $isFresh = is_file($path) && filemtime($path) >= $resume->updated_at->getTimestamp();

        if (! $isFresh) {
            try {
                $png = $generator->generate($resume);
                if (! is_dir(dirname($path))) {
                    mkdir(dirname($path), 0755, true);
                }
                file_put_contents($path, $png);
            } catch (\Throwable $e) {
                Log::warning('Resume thumbnail generation failed', [
                    'resume_id' => $resume->id,
                    'error' => $e->getMessage(),
                ]);

                return $this->placeholderThumbnail($resume);
            }
        }

        return response()->file($path, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, max-age=0, must-revalidate',
        ]);
    }

    private function placeholderThumbnail(Resume $resume): \Illuminate\Http\Response
    {
        [$r, $g, $b] = sscanf(ltrim($resume->accent_color ?: '#4f46e5', '#'), '%02x%02x%02x');

        $img = imagecreatetruecolor(400, 518);
        imagefill($img, 0, 0, imagecolorallocate($img, $r ?? 79, $g ?? 70, $b ?? 229));
        ob_start();
        imagepng($img);
        $blob = ob_get_clean();
        imagedestroy($img);

        return response($blob, 200, ['Content-Type' => 'image/png']);
    }

    private function buildPdf(Resume $resume): \Barryvdh\DomPDF\PDF
    {
        return Pdf::loadView('resume-pdf', [
            'resume' => $resume,
            'watermark' => $resume->user?->planTier() === 'free',
        ])->setPaper('letter', 'portrait');
    }

    public function beacon(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $data = json_decode($request->getContent(), true) ?? [];

        $validated = validator($data, ResumeRules::rules())->validate();

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

    public function duplicate(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $user = $resume->user;
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->nonSnapshot()->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resume_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $copy = ResumeCopier::copy($resume, $user, 'Copy of '.$resume->name);

        return redirect()->route('builder.edit', $copy->id);
    }
}
