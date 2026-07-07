<?php

namespace App\Http\Controllers\Api;

use App\Data\AiPrompts;
use App\Data\CoverLetterTemplates;
use App\Exceptions\ModerationException;
use App\Http\Controllers\Controller;
use App\Models\CoverLetter;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class CoverLetterController extends Controller
{
    public function __construct(private AiService $ai) {}

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
        $this->authorize('view', $coverLetter);

        return response()->json($coverLetter);
    }

    public function update(Request $request, CoverLetter $coverLetter): JsonResponse
    {
        $this->authorize('update', $coverLetter);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template_key' => ['sometimes', 'required', 'in:'.implode(',', CoverLetterTemplates::keys())],
            'body' => ['sometimes', 'string', 'max:50000'],
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

    public function destroy(CoverLetter $coverLetter): Response
    {
        $this->authorize('delete', $coverLetter);
        $coverLetter->delete();

        return response()->noContent();
    }

    public function generate(Request $request, CoverLetter $coverLetter): JsonResponse
    {
        $this->authorize('update', $coverLetter);

        $user = $request->user();

        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => 'Monthly AI limit reached.',
                'can_upgrade' => UserLimits::aiCanUpgrade($user),
                'next_tier' => UserLimits::aiNextTier($user),
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
                'resets_at' => now()->startOfMonth()->addMonth()->format('M j'),
            ], 402);
        }

        $validated = $request->validate([
            'tone' => ['required', 'in:formal,warm,brief'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);

        $resume = $coverLetter->resume;

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('cover_letter', [
                    'tone' => $validated['tone'],
                    'job_description' => $validated['job_description'] ?? null,
                    'role' => $resume?->experience[0]['title'] ?? null,
                    'company' => $resume?->experience[0]['company'] ?? null,
                    'experience' => $resume?->experience ?? [],
                    'skills' => $resume?->skills ?? [],
                ]),
                ['user' => $user, 'feature' => 'cover_letter'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $coverLetter->update(['body' => $reply]);

        return response()->json([
            'body' => $reply,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
