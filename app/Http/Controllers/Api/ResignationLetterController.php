<?php

namespace App\Http\Controllers\Api;

use App\Data\ResignationLetterTemplates;
use App\Http\Controllers\Controller;
use App\Models\ResignationLetter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ResignationLetterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $letters = $request->user()
            ->resignationLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return response()->json(['data' => $letters]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key' => ['required', 'in:'.implode(',', ResignationLetterTemplates::keys())],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $letter = $request->user()->resignationLetters()->create([
            'name' => $validated['name'],
            'template_key' => $validated['template_key'],
            'body' => ResignationLetterTemplates::render($validated['template_key'], [
                'name' => $request->user()->name,
            ]),
        ]);

        return response()->json($letter, 201);
    }

    public function show(ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('view', $resignationLetter);

        return response()->json($resignationLetter);
    }

    public function update(Request $request, ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('update', $resignationLetter);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template_key' => ['sometimes', 'required', 'in:'.implode(',', ResignationLetterTemplates::keys())],
            'body' => ['sometimes', 'string', 'max:50000'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $resignationLetter->update($validated);

        return response()->json($resignationLetter->fresh());
    }

    public function destroy(ResignationLetter $resignationLetter): Response
    {
        $this->authorize('delete', $resignationLetter);
        $resignationLetter->delete();

        return response()->noContent();
    }
}
