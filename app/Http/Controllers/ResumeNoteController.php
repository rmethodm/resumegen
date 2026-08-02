<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeNoteController extends Controller
{
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $resume->notes()->create($validated);

        return back();
    }

    public function update(Request $request, Resume $resume, ResumeNote $note): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($note->resume_id !== $resume->id, 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $note->update($validated);

        return back();
    }

    public function destroy(Resume $resume, ResumeNote $note): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($note->resume_id !== $resume->id, 403);

        $note->delete();

        return back();
    }
}
