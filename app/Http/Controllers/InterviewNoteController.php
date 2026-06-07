<?php

namespace App\Http\Controllers;

use App\Models\InterviewNote;
use App\Models\JobApplication;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InterviewNoteController extends Controller
{
    public function store(Request $request, JobApplication $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ]);

        $application->interviewNotes()->create($validated);

        return back();
    }

    public function destroy(Request $request, JobApplication $application, InterviewNote $note): RedirectResponse
    {
        $this->authorize('update', $application);

        abort_if($note->job_application_id !== $application->id, 403);

        $note->delete();

        return back();
    }
}
