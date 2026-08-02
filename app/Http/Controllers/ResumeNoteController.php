<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResumeNoteRequest;
use App\Http\Requests\UpdateResumeNoteRequest;
use App\Models\Resume;
use App\Models\ResumeNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Canvas sticky notes. Deliberately separate from ResumeController::update():
 * that path rewrites the whole document and deletes its child rows, so notes
 * must never travel through it. Ownership 404s throughout — a 403 would confirm
 * the record exists.
 */
class ResumeNoteController extends Controller
{
    public function store(StoreResumeNoteRequest $request, Resume $resume): RedirectResponse
    {
        // resume_id comes from the relation, never from request input.
        $resume->notes()->create($this->coerceBody($request->validated()));

        return back();
    }

    public function update(UpdateResumeNoteRequest $request, ResumeNote $resumeNote): RedirectResponse
    {
        $resumeNote->update($this->coerceBody($request->validated()));

        return back();
    }

    /**
     * The empty-string middleware nulls a blank body; the column is non-null,
     * and a note with no text is legitimate, so store '' rather than null.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function coerceBody(array $data): array
    {
        if (array_key_exists('body', $data) && $data['body'] === null) {
            $data['body'] = '';
        }

        return $data;
    }

    /**
     * No Form Request: there is nothing to validate, so ownership is checked
     * here the same way ResumeGroupController does it.
     */
    public function destroy(Request $request, ResumeNote $resumeNote): RedirectResponse
    {
        abort_unless($resumeNote->resume->user_id === $request->user()->id, 404);

        $resumeNote->delete();

        return back();
    }
}
