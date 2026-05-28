<?php

namespace App\Http\Controllers;

use App\Data\CoverLetterTemplates;
use App\Models\CoverLetter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CoverLetterController extends Controller
{
    public function index(Request $request): Response
    {
        $letters = $request->user()
            ->coverLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return Inertia::render('CoverLetter/Index', [
            'letters' => $letters,
            'templates' => collect(CoverLetterTemplates::TEMPLATES)->map(fn ($t, $k) => [
                'key' => $k,
                'label' => $t['label'],
                'description' => $t['description'],
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'template_key' => ['required', 'in:'.implode(',', CoverLetterTemplates::keys())],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $letter = $request->user()->coverLetters()->create([
            'name' => $validated['name'],
            'template_key' => $validated['template_key'],
            'body' => CoverLetterTemplates::render($validated['template_key'], [
                'name' => $request->user()->name,
            ]),
        ]);

        return redirect()->route('cover-letters.edit', $letter->id);
    }

    public function edit(Request $request, CoverLetter $letter): Response
    {
        $this->authorize('update', $letter);

        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('CoverLetter/Edit', [
            'letter' => $letter,
            'resumes' => $resumes,
        ]);
    }

    public function update(Request $request, CoverLetter $letter)
    {
        $this->authorize('update', $letter);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $letter->update($validated);

        return back();
    }

    public function destroy(Request $request, CoverLetter $letter)
    {
        $this->authorize('delete', $letter);
        $letter->delete();

        return redirect()->route('cover-letters.index');
    }
}
