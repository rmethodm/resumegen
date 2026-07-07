<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use App\Services\ResumeCopier;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        $input = [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        $cacheKey = 'ai_summary_'.$resume->id.'_'.md5(json_encode($input));

        return $this->run($request->user(), 'generate_summary', $input,
            fn (string $reply): array => ['suggestion' => trim($reply)],
            $cacheKey,
        );
    }

    public function atsKeywords(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canAiTailoring($request->user())) {
            return response()->json([
                'error' => 'AI job tailoring is a Starter feature.',
                'required_tier' => 'starter',
            ], 402);
        }

        $data = $request->validate([
            'role' => ['nullable', 'string', 'max:200'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);
        $role = $data['role'] ?? $request->user()->target_role ?? '';
        $jobDescription = $data['job_description'] ?? $resume->target_job_description ?? '';

        $input = [
            'role' => $role,
            'job_description' => $jobDescription,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        $cacheKey = 'ai_ats_'.$resume->id.'_'.md5(json_encode($input));

        return $this->run($request->user(), 'ats_keywords', $input,
            fn (string $reply): array => ['keywords' => $this->splitKeywords($reply)],
            $cacheKey,
        );
    }

    public function careerMap(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $user = $request->user();

        if (! UserLimits::canCareerMap($user)) {
            return response()->json([
                'error' => 'Career Map is a Pro feature.',
                'required_tier' => 'pro',
            ], 402);
        }

        $input = [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        return $this->run($user, 'career_map', $input,
            fn (string $reply): array => $this->shapeCareerMap($reply));
    }

    public function translate(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $user = $request->user();

        $data = $request->validate([
            'language' => ['required', 'string', 'in:spanish,french,german,portuguese,italian,mandarin,japanese'],
        ]);
        $language = $data['language'];

        if (! UserLimits::canTranslate($user)) {
            return response()->json([
                'error' => 'Resume translation is a Starter feature.',
                'required_tier' => 'starter',
            ], 402);
        }

        $limit = UserLimits::resumeLimit($user);
        if ($limit !== null && $user->resumes()->nonSnapshot()->count() >= $limit) {
            return response()->json([
                'error' => 'Resume limit reached.',
                'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
            ], 402);
        }

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

        $content = [
            'summary' => $resume->summary,
            'experience' => $resume->experience ?? [],
            'education' => $resume->education ?? [],
            'skills' => $resume->skills ?? [],
            'skills_groups' => $resume->skills_groups ?? [],
            'skill_narratives' => $resume->skill_narratives ?? [],
            'custom_sections' => $resume->custom_sections ?? [],
        ];

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('translate_resume', ['language' => $language, 'content' => $content]),
                ['user' => $user, 'feature' => 'translate_resume'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $translated = json_decode($reply, true);
        $sameShape = is_array($translated)
            && array_diff(array_keys($content), array_keys($translated)) === []
            && array_diff(array_keys($translated), array_keys($content)) === [];

        if (! $sameShape) {
            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $labels = [
            'spanish' => 'Spanish', 'french' => 'French', 'german' => 'German',
            'portuguese' => 'Portuguese', 'italian' => 'Italian', 'mandarin' => 'Mandarin', 'japanese' => 'Japanese',
        ];
        $copy = ResumeCopier::copy($resume, $user, "{$resume->name} ({$labels[$language]})");
        $copy->update($translated);

        return response()->json([
            'resume_id' => $copy->id,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }

    /**
     * Gate, call OpenAI, and shape the JSON response. Shared by all three actions.
     *
     * @param  array<string, mixed>  $input
     * @param  callable(string): array<string, mixed>  $shape
     */
    private function run(User $user, string $feature, array $input, callable $shape, ?string $cacheKey = null): JsonResponse
    {
        if ($cacheKey && Cache::has($cacheKey)) {
            return response()->json(array_merge($shape(Cache::get($cacheKey)), [
                'remaining' => UserLimits::aiRemaining($user),
            ]));
        }

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

            $shaped = $shape($reply);
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        if ($cacheKey) {
            Cache::put($cacheKey, $reply, now()->addDay());
        }

        return response()->json(array_merge($shaped, [
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

    /**
     * @return array{paths: array<int, mixed>}
     */
    private function shapeCareerMap(string $reply): array
    {
        $decoded = json_decode($reply, true);

        if (! is_array($decoded) || $decoded === []) {
            throw new \RuntimeException('Malformed career_map AI reply.');
        }

        return ['paths' => array_slice(array_values($decoded), 0, 3)];
    }
}
