<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\CareerCoachMessage;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CareerCoachController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $messages = CareerCoachMessage::where('user_id', $user->id)
            ->orderBy('id')
            ->get(['id', 'role', 'content', 'created_at']);

        return Inertia::render('CareerCoach/Index', [
            'messages' => $messages,
            'canUseCareerCoach' => UserLimits::canCareerCoach($user),
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! UserLimits::canCareerCoach($user)) {
            return response()->json([
                'error' => 'Career Coach is a Pro feature.',
                'required_tier' => 'pro',
            ], 402);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $userMessage = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $validated['message'],
        ]);

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

        $history = CareerCoachMessage::where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn (CareerCoachMessage $m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->all();

        $resume = $user->resumes()->latest('updated_at')->first();
        $resumeContext = $resume ? [
            'summary' => $resume->summary,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ] : null;

        try {
            $reply = $this->ai->chat(
                $userMessage->content,
                [
                    'messages' => [
                        ['role' => 'system', 'content' => AiPrompts::build('career_coach', ['resume_context' => $resumeContext])],
                        ...$history,
                    ],
                    'user' => $user,
                    'feature' => 'career_coach',
                ],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $assistantMessage = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $reply,
        ]);

        return response()->json([
            'message' => [
                'role' => $assistantMessage->role,
                'content' => $assistantMessage->content,
                'created_at' => $assistantMessage->created_at,
            ],
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
