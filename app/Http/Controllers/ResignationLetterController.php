<?php

namespace App\Http\Controllers;

use App\Data\ResignationLetterTemplates;
use App\Models\ResignationLetter;
use App\Services\UserLimits;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResignationLetterController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $letters = $user
            ->resignationLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return Inertia::render('ResignationLetter/Index', [
            'letters' => $letters,
            'templates' => collect(ResignationLetterTemplates::TEMPLATES)->map(fn ($t, $k) => [
                'key' => $k,
                'label' => $t['label'],
                'description' => $t['description'],
            ])->values(),
            'resignationLetterLimit' => UserLimits::resignationLetterLimit($user),
            'resignationLetterCount' => $user->resignationLetters()->count(),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $limit = UserLimits::resignationLetterLimit($user);
        if ($limit !== null && $user->resignationLetters()->count() >= $limit) {
            return back()->with('featureGate', [
                'feature' => 'resignation_letter_limit',
                'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ]);
        }

        $validated = $request->validate([
            'template_key' => ['required', 'in:'.implode(',', ResignationLetterTemplates::keys())],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $letter = $user->resignationLetters()->create([
            'name' => $validated['name'],
            'template_key' => $validated['template_key'],
            'body' => ResignationLetterTemplates::render($validated['template_key'], [
                'name' => $user->name,
            ]),
        ]);

        return redirect()->route('resignation-letters.edit', $letter->id);
    }

    public function edit(Request $request, ResignationLetter $letter): Response
    {
        $this->authorize('update', $letter);

        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('ResignationLetter/Edit', [
            'letter' => $letter,
            'resumes' => $resumes,
        ]);
    }

    public function update(Request $request, ResignationLetter $letter)
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

    public function destroy(Request $request, ResignationLetter $letter)
    {
        $this->authorize('delete', $letter);
        $letter->delete();

        return redirect()->route('resignation-letters.index');
    }
}
