<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ResumeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $resumes = $request->user()
            ->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template', 'pdf_filename', 'updated_at']);

        return response()->json(['data' => $resumes]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
            return response()->json([
                'message' => 'Resume limit reached.',
                'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ], 402);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $user->resumes()->create([
            'name' => $validated['name'],
            'pdf_filename' => Str::uuid().'.pdf',
        ]);

        return response()->json($resume, 201);
    }

    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        return response()->json($resume);
    }

    public function update(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate(self::resumeRules());
        $resume->update($validated);

        return response()->json($resume->fresh());
    }

    public function destroy(Resume $resume): Response
    {
        $this->authorize('delete', $resume);
        $resume->delete();

        return response()->noContent();
    }

    public function duplicate(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $user = $resume->user;
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
            return response()->json([
                'message' => 'Resume limit reached.',
                'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ], 402);
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
        ]);

        return response()->json($copy, 201);
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
}
