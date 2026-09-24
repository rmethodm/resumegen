<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResumeSnapshotRequest;
use App\Models\Resume;
use App\Models\ResumeSnapshot;
use App\Support\ResumeDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Manual document checkpoints for the workstation.
 * Snapshots store a full ResumeDocument array; restore rewrites the live resume.
 */
class ResumeSnapshotController extends Controller
{
    public function store(StoreResumeSnapshotRequest $request, Resume $resume): RedirectResponse
    {
        $resume->snapshots()->create([
            'label' => $request->validated('label'),
            'document' => ResumeDocument::toArray($resume),
        ]);

        return back()->with('success', 'Checkpoint saved.');
    }

    public function restore(Request $request, Resume $resume, ResumeSnapshot $snapshot): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);
        abort_unless($snapshot->resume_id === $resume->id, 404);

        $document = $snapshot->document;
        if (! is_array($document)) {
            return back()->with('error', 'Checkpoint is empty.');
        }

        // Keep the live version title unless the snapshot carried one.
        $document['title'] = $document['title'] ?? $resume->title;

        ResumeDocument::save($resume, $document);

        return back()->with('success', 'Restored from checkpoint.');
    }

    public function destroy(Request $request, Resume $resume, ResumeSnapshot $snapshot): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 404);
        abort_unless($snapshot->resume_id === $resume->id, 404);

        $snapshot->delete();

        return back()->with('success', 'Checkpoint deleted.');
    }
}
