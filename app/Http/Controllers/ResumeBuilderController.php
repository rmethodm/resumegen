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
        $resumes = $request->user()
            ->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'pdf_filename', 'updated_at']);

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $request->user()->resumes()->create([
            'name'         => $validated['name'],
            'pdf_filename' => Str::uuid() . '.pdf',
        ]);

        return redirect()->route('builder.edit', $resume->id);
    }

    public function edit(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $resume->load(['shareLinks', 'questions.shareLink']);

        $questions = $resume->questions->map(fn($q) => [
            'id'           => $q->id,
            'sender_name'  => $q->sender_name,
            'sender_email' => $q->sender_email,
            'sender_phone' => $q->sender_phone,
            'message'      => $q->message,
            'is_read'      => $q->is_read,
            'link_label'   => $q->shareLink?->label ?? '(unlabelled)',
            'created_at'   => $q->created_at->toDateTimeString(),
        ]);

        return Inertia::render('ResumeBuilder/Edit', [
            'resume'     => $resume,
            'shareLinks' => $resume->shareLinks,
            'questions'  => $questions,
        ]);
    }

    public function update(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'template'       => ['sometimes', 'required', 'in:classic,modern,minimal'],
            'summary'        => ['nullable', 'string'],
            'contact'        => ['nullable', 'array'],
            'experience'     => ['nullable', 'array'],
            'education'      => ['nullable', 'array'],
            'skills'         => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
        ]);

        $resume->update($validated);

        return back();
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

        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait');

        return $pdf->download($resume->pdf_filename ?? ($resume->id . '.pdf'));
    }

    public function beacon(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $data = json_decode($request->getContent(), true) ?? [];

        $validated = validator($data, [
            'name'           => ['sometimes', 'required', 'string', 'max:255'],
            'template'       => ['sometimes', 'required', 'in:classic,modern,minimal'],
            'summary'        => ['nullable', 'string'],
            'contact'        => ['nullable', 'array'],
            'experience'     => ['nullable', 'array'],
            'education'      => ['nullable', 'array'],
            'skills'         => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
        ])->validate();

        $resume->update($validated);

        return response()->noContent();
    }
}
