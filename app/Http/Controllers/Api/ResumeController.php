<?php

namespace App\Http\Controllers\Api;

use App\Concerns\GuardsMobileTokens;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateResumeRequest;
use App\Models\Resume;
use App\Support\PdfFonts;
use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Token-auth JSON API for the iPhone app — full resume CRUD through the
 * same {@see ResumeDocument} shape the web builder reads and writes.
 */
class ResumeController extends Controller
{
    use GuardsMobileTokens;

    public function index(Request $request): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);

        $query = $user->resumes()->orderByDesc('updated_at');

        // Incremental pull for the iPad app: only resumes changed since the
        // given timestamp, plus ids deleted since then (hard deletes are
        // recorded in resume_deletions because there are no tombstone rows).
        $since = $request->query('since');
        $sinceAt = is_string($since) ? rescue(fn () => Carbon::parse($since), null, false) : null;

        if ($sinceAt !== null) {
            $query->where('updated_at', '>', $sinceAt);
        }

        $resumes = $query->get(['id', 'group_id', 'client_uuid', 'title', 'target_role', 'updated_at']);

        $deleted = $sinceAt === null ? [] : DB::table('resume_deletions')
            ->where('user_id', $user->id)
            ->where('deleted_at', '>', $sinceAt)
            ->pluck('resume_id')
            ->all();

        return response()->json(['resumes' => $resumes, 'deleted' => $deleted]);
    }

    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
        abort_unless($resume->user_id === $user->id, 404);

        return response()->json($this->document($resume));
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);

        $data = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        // Idempotent for offline retries: the same client_uuid returns the
        // resume the first attempt created instead of a duplicate.
        $clientUuid = $data['client_uuid'] ?? null;
        if ($clientUuid !== null) {
            $existing = $user->resumes()->where('client_uuid', $clientUuid)->first();
            if ($existing !== null) {
                return response()->json($this->document($existing));
            }
        }

        $resume = $user->resumes()->create([
            'title' => 'Untitled resume',
            'client_uuid' => $clientUuid,
        ]);

        return response()->json($this->document($resume), 201);
    }

    public function update(UpdateResumeRequest $request, Resume $resume): JsonResponse
    {
        $this->ensureMobileToken($request);
        $this->ensureNotDisabled($request);

        // Optimistic concurrency, same check as the web controller — but a
        // 409 carrying the current server document, so the app can run its
        // conflict strategy instead of showing a reload banner.
        $base = $request->input('base_updated_at');
        if (is_string($base) && $base !== '' && $resume->updated_at !== null) {
            $client = strtotime($base);
            $server = $resume->updated_at->getTimestamp();
            if ($client !== false && abs($server - $client) > 1) {
                return response()->json($this->document($resume), 409);
            }
        }

        $data = $request->validated();
        unset($data['base_updated_at']);

        ResumeDocument::save($resume, $data);

        return response()->json($this->document($resume->fresh()));
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

    /** @return array<string, mixed> */
    private function document(Resume $resume): array
    {
        $document = ResumeDocument::toArray($resume);
        $document['client_uuid'] = $resume->client_uuid;
        $document['updated_at'] = $resume->updated_at?->toIso8601String();

        return $document;
    }

    /**
     * Inline PDF stream — same render as the web workstation's preview and
     * download, so the app shows exactly what export produces.
     */
    public function pdf(Request $request, Resume $resume): HttpResponse
    {
        $this->ensureMobileToken($request);
        $user = $this->ensureNotDisabled($request);
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
}
