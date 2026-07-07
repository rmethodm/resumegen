<?php

namespace App\Http\Controllers\Api;

use App\Data\ResumeRules;
use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\ResumeCopier;
use App\Services\UserLimits;
use Barryvdh\DomPDF\Facade\Pdf;
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

        if ($limit !== null && $user->resumes()->count() >= $limit) {
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

        return response()->json($resume->toArray() + ['photo_url' => $resume->getFirstMediaUrl('photo') ?: null]);
    }

    public function update(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate(ResumeRules::rules());
        $resume->update($validated);

        return response()->json($resume->fresh());
    }

    public function destroy(Resume $resume): Response
    {
        $this->authorize('delete', $resume);
        $resume->delete();

        return response()->noContent();
    }

    public function pdf(Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $pdf = Pdf::loadView('resume-pdf', [
            'resume' => $resume,
            'watermark' => $resume->user?->planTier() === 'free',
        ])->setPaper('letter', 'portrait');

        return $pdf->download($resume->pdf_filename ?? ($resume->id.'.pdf'));
    }

    public function duplicate(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $user = $resume->user;
        $limit = UserLimits::resumeLimit($user);

        if ($limit !== null && $user->resumes()->count() >= $limit) {
            return response()->json([
                'message' => 'Resume limit reached.',
                'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ], 402);
        }

        $copy = ResumeCopier::copy($resume, $user, 'Copy of '.$resume->name);

        return response()->json($copy, 201);
    }
}
