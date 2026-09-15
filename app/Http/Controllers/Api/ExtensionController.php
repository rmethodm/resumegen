<?php

namespace App\Http\Controllers\Api;

use App\Actions\CreateJobApplication;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJobApplicationRequest;
use App\Http\Requests\StoreQaBankEntryRequest;
use App\Models\Resume;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\PdfFonts;
use App\Support\QaBankMatcher;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use App\Support\ResumeFillProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
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

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
        ]);
    }

    public function resumes(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

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

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

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

    public function qaBankMatch(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $request->validate(['question' => ['required', 'string', 'max:2000']]);

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

        if ($status = $limiter->refusalStatus($user, $cost)) {
            $message = $status === 429 ? 'AI access is blocked.' : 'Subscription or AI credits required.';

            return response()->json(['message' => $message], $status);
        }

        try {
            $result = $ai->draftQaAnswer($user, $question, $profile);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI draft failed.'], 500);
        }

        $credits->spend($user, $cost, 'qa_bank_draft', $result['ai_request_id']);

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

    public function updateTargetJobDescription(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureExtensionToken($request);

        abort_unless($resume->user_id === $request->user()->id, 404);

        $request->validate([
            'target_job_description' => ['nullable', 'string', 'max:10000'],
        ]);

        $resume->update(['target_job_description' => $request->input('target_job_description', '')]);

        return response()->json(['ok' => true]);
    }

    public function pdf(Request $request, Resume $resume): HttpResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();
        abort_unless($resume->user_id === $user->id, 404);

        $doc = ResumeDocument::toArray($resume);
        $filename = ResumeExport::filename($doc);
        $pdfFont = PdfFonts::resolve($resume->font);
        PdfFonts::ensureInstalled($pdfFont);

        return Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->setPaper('letter')->stream("{$filename}.pdf");
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
