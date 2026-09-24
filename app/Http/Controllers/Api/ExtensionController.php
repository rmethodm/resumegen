<?php

namespace App\Http\Controllers\Api;

use App\Actions\CreateJobApplication;
use App\Http\Controllers\Controller;
use App\Http\Requests\MatchQaBankQuestionRequest;
use App\Http\Requests\StoreJobApplicationRequest;
use App\Http\Requests\StoreQaBankEntryRequest;
use App\Http\Requests\UpdateResumeTargetJobDescriptionRequest;
use App\Models\Resume;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\PdfExport;
use App\Support\QaBankMatcher;
use App\Support\ResumeFillProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Context;
use Throwable;

/**
 * Token-auth JSON API for the Resumegen Apply browser extension.
 */
class ExtensionController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
        ]);
    }

    public function resumes(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        return response()->json([
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'groups' => ResumeFillProfile::groupsForUser($user->id),
        ]);
    }

    public function fillProfile(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        return response()->json(ResumeFillProfile::from($resume));
    }

    public function qaBank(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $entries = $request->user()->starterProfile?->qaBankEntries ?? collect();

        return response()->json([
            'entries' => $entries->map(fn ($entry) => [
                'id' => $entry->id,
                'question' => $entry->question,
                'answer' => $entry->answer,
            ])->all(),
        ]);
    }

    public function qaBankMatch(MatchQaBankQuestionRequest $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $entries = $request->user()->starterProfile?->qaBankEntries ?? collect();

        $result = QaBankMatcher::match($entries, $request->string('question')->toString());

        return response()->json($result);
    }

    public function qaBankStore(StoreQaBankEntryRequest $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $profile = $request->user()->starterProfile()->firstOrCreate(
            ['user_id' => $request->user()->id],
        );

        $nextPosition = ((int) $profile->qaBankEntries()->max('position')) + 1;

        $entry = $profile->qaBankEntries()->create([
            ...$request->validated(),
            'position' => $nextPosition,
        ]);

        return response()->json([
            'id' => $entry->id,
            'question' => $entry->question,
            'answer' => $entry->answer,
        ], 201);
    }

    public function qaBankDraft(Request $request, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        $request->validate([
            'question' => ['required', 'string', 'max:2000'],
            'resume_id' => ['required', 'integer'],
        ]);

        abort_unless(
            Resume::where('id', $request->integer('resume_id'))->where('user_id', $user->id)->exists(),
            404
        );

        $question = $request->string('question')->toString();

        $profile = $user->starterProfile()->firstOrCreate(['user_id' => $user->id]);

        $matched = QaBankMatcher::match($profile->qaBankEntries, $question);
        if ($matched['match'] !== null && filled($matched['match']['answer'])) {
            return response()->json([
                'answer' => $matched['match']['answer'],
                'source' => 'qa_bank',
                'cost' => null,
            ]);
        }

        $cost = (int) config('ai.costs.qa_bank_draft');

        $debit = $limiter->reserve($user, $cost, 'qa_bank_draft');

        if (is_int($debit)) {
            $message = $debit === 429 ? 'AI access is blocked.' : 'Subscription or AI credits required.';

            return response()->json(['message' => $message], $debit);
        }

        try {
            $result = $ai->draftQaAnswer($user, $question, $profile);
        } catch (Throwable $e) {
            $credits->refund($debit);
            Context::add(['ai_feature' => 'qa_bank_draft', 'ai_user_id' => $user->id]);
            report($e);

            return response()->json(['message' => 'AI draft failed.'], 502);
        }

        $credits->attachRequest($debit, $result['ai_request_id']);

        return response()->json([
            'answer' => $result['text'],
            'source' => 'ai',
            'cost' => $cost,
            'credits_remaining' => $credits->balance($user),
        ]);
    }

    public function jobApplicationStore(StoreJobApplicationRequest $request, CreateJobApplication $createJobApplication): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $jobApplication = $createJobApplication->handle($request->user(), $request->validated());

        return response()->json([
            'id' => $jobApplication->id,
            'company' => $jobApplication->company,
            'role' => $jobApplication->role,
            'status' => $jobApplication->status,
            'resume_id' => $jobApplication->resume_id,
        ], 201);
    }

    public function jobPool(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        $entries = $user->jobPoolEntries()
            ->with(['jobListing', 'resume'])
            ->latest('id')
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'title' => $entry->jobListing->title,
                'company' => $entry->jobListing->company,
                'job_url' => $entry->jobListing->job_url,
                'resume_id' => $entry->resume_id,
                'resume_title' => $entry->resume->title,
            ]);

        return response()->json(['entries' => $entries]);
    }

    public function updateTargetJobDescription(UpdateResumeTargetJobDescriptionRequest $request, Resume $resume): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $resume->update(['target_job_description' => $request->input('target_job_description', '')]);

        return response()->json(['ok' => true]);
    }

    public function pdf(Request $request, Resume $resume): HttpResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();
        abort_unless($resume->user_id === $user->id, 404);

        return PdfExport::for($resume)->stream();
    }

    private function ensureExtensionToken(Request $request): void
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $token = $user->currentAccessToken();

        // Sanctum::actingAs in tests may not set a real token instance.
        if ($token === null) {
            return;
        }

        abort_unless(
            $token->can(ResumeFillProfile::TOKEN_ABILITY) || $token->can('*'),
            403,
            'This token cannot access the extension API.'
        );
    }
}
