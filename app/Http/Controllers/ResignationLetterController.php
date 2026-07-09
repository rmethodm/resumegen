<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Data\ResignationLetterTemplates;
use App\Exceptions\ModerationException;
use App\Models\ResignationLetter;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ResignationLetterController extends Controller
{
    public function __construct(private AiService $ai) {}

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
            'aiRemaining' => UserLimits::aiRemaining($request->user()),
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

    public function generate(Request $request, ResignationLetter $letter): JsonResponse
    {
        $this->authorize('update', $letter);

        $user = $request->user();

        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => UserLimits::aiLimitMessage($user),
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

        $resume = $letter->resume;

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

        $letter->update(['body' => $reply]);

        return response()->json([
            'body' => $reply,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
