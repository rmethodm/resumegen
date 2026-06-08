<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrgResumeController extends Controller
{
    public function show(Request $request, Resume $resume): Response
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $note = RecruiterNote::where('organization_id', $org->id)
            ->where('resume_id', $resume->id)
            ->first();

        return Inertia::render('Org/Resume', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'previewUrl' => route('org.resume.preview', $resume->id),
            'note' => $note?->body ?? '',
            'orgName' => $org->name,
            'candidateName' => $resume->user?->name,
        ]);
    }

    public function preview(Request $request, Resume $resume): StreamedResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait');

        return response()->streamDownload(
            fn () => print ($pdf->output()),
            $resume->pdf_filename,
            ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline'],
        );
    }

    public function upsertNote(Request $request, Resume $resume): JsonResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->verifyMemberResume($org, $resume);

        $request->validate(['body' => ['nullable', 'string', 'max:2000']]);

        $body = $request->string('body')->toString();

        if ($body === '') {
            RecruiterNote::where('organization_id', $org->id)
                ->where('resume_id', $resume->id)
                ->delete();
        } else {
            RecruiterNote::updateOrCreate(
                ['organization_id' => $org->id, 'resume_id' => $resume->id],
                ['author_id' => $request->user()->id, 'body' => $body],
            );
        }

        return response()->json(['ok' => true]);
    }

    private function verifyMemberResume(Organization $org, Resume $resume): void
    {
        $memberUserIds = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNotNull('joined_at')
            ->pluck('user_id');

        if (! $memberUserIds->contains($resume->user_id)) {
            abort(403);
        }
    }
}
