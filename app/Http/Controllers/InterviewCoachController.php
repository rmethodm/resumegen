<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\Resume;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class InterviewCoachController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function coach(Request $request, Resume $resume): JsonResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $user = $request->user();

        if ($user->ai_blocked) {
            return response()->json([
                'error' => 'AI features are disabled for this account.',
            ], 402);
        }

        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => UserLimits::aiLimitMessage($user),
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
                'resets_at' => now()->startOfMonth()->addMonth()->format('M j'),
            ], 402);
        }

        $validated = $request->validate([
            'target_role' => ['required', 'string', 'max:100'],
            'job_description' => ['nullable', 'string', 'max:3000'],
        ]);

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('interview_coach', [
                    'target_role' => $validated['target_role'],
                    'job_description' => $validated['job_description'] ?? null,
                    'name' => $resume->full_name ?: null,
                    'experience' => $resume->experiences->map(fn ($e) => [
                        'title' => $e->title,
                        'company' => $e->company,
                        'bullets' => implode("\n", $e->bullets ?? []),
                    ])->all(),
                    'skills' => $resume->skills->pluck('name')->all(),
                ]),
                ['user' => $user, 'feature' => 'interview_coach'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $questions = json_decode($reply, true);

        if (! is_array($questions)) {
            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        return response()->json([
            'questions' => array_slice(array_values($questions), 0, 8),
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
