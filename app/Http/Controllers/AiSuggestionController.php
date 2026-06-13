<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiSuggestionController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function rewriteBullet(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate(['text' => ['required', 'string', 'max:8000']]);

        return $this->run($request->user(), 'rewrite_bullet', ['text' => $data['text']],
            fn (string $reply): array => ['suggestion' => trim($reply)]);
    }

    public function summary(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (empty($resume->experience) && empty($resume->skills)) {
            abort(422, 'Add experience or skills before generating a summary.');
        }

        return $this->run($request->user(), 'generate_summary', [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ], fn (string $reply): array => ['suggestion' => trim($reply)]);
    }

    public function atsKeywords(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate([
            'role' => ['nullable', 'string', 'max:200'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);
        $role = $data['role'] ?? $request->user()->target_role ?? '';
        $jobDescription = $data['job_description'] ?? $resume->target_job_description ?? '';

        return $this->run($request->user(), 'ats_keywords', [
            'role' => $role,
            'job_description' => $jobDescription,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ], fn (string $reply): array => ['keywords' => $this->splitKeywords($reply)]);
    }

    /**
     * Gate, call OpenAI, and shape the JSON response. Shared by all three actions.
     *
     * @param  array<string, mixed>  $input
     * @param  callable(string): array<string, mixed>  $shape
     */
    private function run(User $user, string $feature, array $input, callable $shape): JsonResponse
    {
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

        try {
            $reply = $this->ai->chat(
                AiPrompts::build($feature, $input),
                ['user' => $user, 'feature' => $feature],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        return response()->json(array_merge($shape($reply), [
            'remaining' => UserLimits::aiRemaining($user),
        ]));
    }

    /**
     * @return array<int, string>
     */
    private function splitKeywords(string $reply): array
    {
        return collect(preg_split('/[,\n]+/', $reply) ?: [])
            ->map(fn (string $k): string => trim($k, " \t\n\r\0\x0B-•*"))
            ->filter()
            ->take(20)
            ->values()
            ->all();
    }
}
