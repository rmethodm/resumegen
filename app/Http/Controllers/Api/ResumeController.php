<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateResumeRequest;
use App\Models\Resume;
use App\Models\User;
use App\Support\MobileApiToken;
use App\Support\ResumeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Token-auth JSON API for the iPhone app — full resume CRUD through the
 * same {@see ResumeDocument} shape the web builder reads and writes.
 */
class ResumeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);

        $resumes = $user->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'group_id', 'title', 'target_role', 'updated_at']);

        return response()->json(['resumes' => $resumes]);
    }

    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resume->user_id === $user->id, 404);

        $document = ResumeDocument::toArray($resume);
        $document['updated_at'] = $resume->updated_at?->toIso8601String();

        return response()->json($document);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);

        $resume = $user->resumes()->create([
            'title' => 'Untitled resume',
        ]);

        return response()->json(ResumeDocument::toArray($resume), 201);
    }

    public function update(UpdateResumeRequest $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $this->ensureNotDisabled($request);

        $data = $request->validated();
        unset($data['base_updated_at']);

        ResumeDocument::save($resume, $data);

        $document = ResumeDocument::toArray($resume->fresh());
        $document['updated_at'] = $resume->fresh()->updated_at?->toIso8601String();

        return response()->json($document);
    }

    public function destroy(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resume->user_id === $user->id, 404);

        // A group's base version can't be deleted, matching the web builder.
        abort_if($resume->id === $resume->group->resumes()->min('id'), 403);

        $resume->delete();

        return response()->json(status: 204);
    }

    private function ensureMobileToken(Request $request): void
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $token = $user->currentAccessToken();

        // Sanctum::actingAs in tests may not set a real token instance.
        if ($token === null) {
            return;
        }

        abort_unless(
            $token->can(MobileApiToken::TOKEN_ABILITY) || $token->can('*'),
            403,
            'This token cannot access the mobile API.'
        );
    }

    private function ensureNotDisabled(Request $request): User
    {
        $user = $request->user();

        abort_if($user->disabled_at !== null, 403, 'Account disabled.');

        return $user;
    }
}
