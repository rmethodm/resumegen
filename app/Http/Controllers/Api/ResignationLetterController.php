<?php

namespace App\Http\Controllers\Api;

use App\Data\AiPrompts;
use App\Data\ResignationLetterTemplates;
use App\Exceptions\ModerationException;
use App\Http\Controllers\Controller;
use App\Models\ResignationLetter;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class ResignationLetterController extends Controller
{
    public function __construct(private AiService $ai) {}

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

    public function generate(Request $request, ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('update', $resignationLetter);

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
            'last_day' => ['required', 'date'],
            'tone' => ['required', 'in:formal,warm,brief'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $resume = $resignationLetter->resume;

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('resignation_letter', [
                    'tone' => $validated['tone'],
                    'last_day' => $validated['last_day'],
                    'reason' => $validated['reason'] ?? null,
                    'role' => $resume?->experience[0]['title'] ?? null,
                    'company' => $resume?->experience[0]['company'] ?? null,
                    'experience' => $resume?->experience ?? [],
                ]),
                ['user' => $user, 'feature' => 'resignation_letter'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $resignationLetter->update(['body' => $reply]);

        return response()->json([
            'body' => $reply,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
