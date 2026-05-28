<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeQuestion;
use App\Models\ResumeShareLink;
use Illuminate\Http\Request;

class ShareLinkController extends Controller
{
    public function store(Request $request, Resume $resume)
    {
        $this->authorize('update', $resume);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        $link = $resume->shareLinks()->create($validated);

        return back()->with('newToken', $link->token);
    }

    public function update(Request $request, Resume $resume, ResumeShareLink $link)
    {
        $this->authorize('update', $resume);
        abort_if($link->resume_id !== $resume->id, 403);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $link->update($validated);

        return back();
    }

    public function destroy(Resume $resume, ResumeShareLink $link)
    {
        $this->authorize('update', $resume);
        abort_if($link->resume_id !== $resume->id, 403);
        $link->delete();

        return back();
    }

    public function markRead(Resume $resume, ResumeQuestion $question)
    {
        $this->authorize('update', $resume);
        abort_if($question->resume_id !== $resume->id, 403);
        $question->update(['is_read' => true]);

        return back();
    }

    public function markAllRead(Resume $resume)
    {
        $this->authorize('update', $resume);

        ResumeQuestion::where('resume_id', $resume->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return back();
    }
}
