<?php

namespace App\Http\Controllers;

use App\Data\ResumeRules;
use App\Models\Resume;
use App\Services\DocxGenerator;
use App\Services\ResumeCopier;
use App\Services\ResumeThumbnailGenerator;
use App\Services\UserLimits;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PhpOffice\PhpWord\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResumeBuilderController extends Controller
{
    /**
     * Legacy list UI — user resumes live on Dashboard; templates on resumes.index.
     * Keep the route so old bookmarks resolve.
     */
    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /**
     * Legacy create form — resume creation is on the Dashboard / resumes.store.
     */
    public function create(Request $request): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'template' => ['nullable', 'string', Rule::in(UserLimits::allTemplates())],
        ]);

        $name = $validated['name'] ?? ($user->target_role ? $user->target_role.' Resume' : 'My Resume');

        $attributes = [
            'name' => $name,
            'pdf_filename' => Str::uuid().'.pdf',
        ];

        if (! empty($validated['template'])) {
            $attributes['template'] = $validated['template'];
        } elseif ($user->preferred_template && in_array($user->preferred_template, UserLimits::allTemplates(), true)) {
            $attributes['template'] = $user->preferred_template;
        }

        $resume = $user->resumes()->create($attributes);

        if ($user->profile) {
            $resume->update(['contact' => $user->profile]);
        }

        return redirect()->route('resumes.workstation', $resume);
    }

    /**
     * Legacy editor — Workstation is the only editing surface.
     * Keep the named route so old links and bookmarks still work.
     */
    public function edit(Request $request, Resume $resume): RedirectResponse
    {
        // Match ResumeController ownership (no ResumePolicy in this app).
        abort_unless($resume->user_id === $request->user()->id, 403);

        return redirect()->route('resumes.workstation', $resume);
    }

    public function update(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $validated = $request->validate(ResumeRules::rules());

        $resume->update($validated);

        return back();
    }

    public function shareUrl(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $link = $resume->shareLinks()->latest('id')->first()
            ?? $resume->shareLinks()->create([]);

        return response()->json([
            'url' => route('share.show', $link->token),
        ]);
    }

    public function destroy(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        $resume->delete();

        return redirect()->route('dashboard');
    }

    public function downloadPdf(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return $this->buildPdf($resume)->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function downloadDocx(Request $request, Resume $resume): StreamedResponse|RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

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

    public function previewPdf(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return $this->buildPdf($resume)->stream('preview.pdf');
    }

    public function htmlPreview(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        return response(view('resume-pdf', ['resume' => $resume])->render())
            ->header('Content-Type', 'text/html');
    }

    public function thumbnail(Request $request, Resume $resume, ResumeThumbnailGenerator $generator)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

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

    private function placeholderThumbnail(Resume $resume): Response
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
            'watermark' => false,
        ])->setPaper('letter', 'portrait');
    }

    public function beacon(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $data = json_decode($request->getContent(), true) ?? [];

        $validated = validator($data, ResumeRules::rules())->validate();

        $resume->update($validated);

        return response()->noContent();
    }

    public function createVariant(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $variant = $resume->replicate();
        $variant->name = $resume->name.' (Variant)';
        $variant->ab_parent_id = $resume->id;
        $variant->save();

        return redirect()->route('resumes.workstation', $variant);
    }

    public function duplicate(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $user = $resume->user;

        $copy = ResumeCopier::copy($resume, $user, 'Copy of '.$resume->name);

        return redirect()->route('resumes.workstation', $copy);
    }
}
