<?php

namespace App\Http\Controllers\Api;

use App\Data\CoverLetterTemplates;
use App\Http\Controllers\Controller;
use App\Models\CoverLetter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoverLetterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $letters = $request->user()
            ->coverLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return response()->json(['data' => $letters]);
    }

    public function store(Request $request): JsonResponse
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

        return response()->json($letter, 201);
    }

    public function show(CoverLetter $coverLetter): JsonResponse
    {
        $this->authorize('update', $coverLetter);

        return response()->json($coverLetter);
    }

    public function update(Request $request, CoverLetter $coverLetter): JsonResponse
    {
        $this->authorize('update', $coverLetter);

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

        $coverLetter->update($validated);

        return response()->json($coverLetter->fresh());
    }

    public function destroy(CoverLetter $coverLetter): \Illuminate\Http\Response
    {
        $this->authorize('delete', $coverLetter);
        $coverLetter->delete();

        return response()->noContent();
    }
}
