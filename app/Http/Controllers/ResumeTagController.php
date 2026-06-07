<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeTagController extends Controller
{
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        abort_if(
            $resume->tags()->count() >= 5,
            422,
            'Maximum 5 tags per resume.'
        );

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:30'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $resume->tags()->create($validated);

        return back();
    }

    public function destroy(Resume $resume, ResumeTag $tag): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($tag->resume_id !== $resume->id, 403);

        $tag->delete();

        return back();
    }
}
