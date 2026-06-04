<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ResumeBuilderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resumes = $user->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'pdf_filename', 'updated_at']);

        $atLimit = ! $user->isPro() && $resumes->count() >= 5;

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
            'atLimit' => $atLimit,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user->isPro() && $user->resumes()->count() >= 5) {
            return redirect()->route('billing.index')->with('limitReached', true);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $user->resumes()->create([
            'name' => $validated['name'],
            'pdf_filename' => Str::uuid().'.pdf',
        ]);

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
        ]);
    }

    public function update(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate(self::resumeRules());

        $resume->update($validated);

        return back();
    }

    private static function resumeRules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats'],
            'accent_color' => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family' => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary' => ['nullable', 'string'],
            'contact' => ['nullable', 'array'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'skills' => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'font_sizes' => ['nullable', 'array'],
        ];
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

    public function downloadDocx(Resume $resume): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('update', $resume);

        $word = app(\App\Services\DocxGenerator::class)->generate($resume);

        $filename = $resume->name
            ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resume->name).'.docx'
            : $resume->id.'.docx';

        return response()->stream(function () use ($word) {
            $writer = \PhpOffice\PhpWord\IOFactory::createWriter($word, 'Word2007');
            $writer->save('php://output');
        }, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

        $resume->update($validated);

        return response()->noContent();
    }

    public function duplicate(Resume $resume)
    {
        $this->authorize('update', $resume);

        $copy = $resume->user->resumes()->create([
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
        ]);

        return redirect()->route('builder.edit', $copy->id);
    }
}
