<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;

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
            'label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'resume_id' => ['sometimes', 'integer', 'exists:resumes,id'],
            'is_primary' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:4', 'max:100'],
            'seen' => ['sometimes', 'boolean'],
        ]);

        // Reassigning the link to another resume — must also be the user's.
        if (isset($validated['resume_id'])) {
            $target = Resume::findOrFail($validated['resume_id']);
            $this->authorize('update', $target);
        }

        // Only one primary link per user.
        if (($validated['is_primary'] ?? false) === true) {
            ResumeShareLink::whereHas('resume', fn ($q) => $q->where('user_id', $request->user()->id))
                ->update(['is_primary' => false]);
        }

        if (array_key_exists('password', $validated)) {
            $validated['password_hash'] = $validated['password'] ? Hash::make($validated['password']) : null;
        }

        if ($request->boolean('seen')) {
            $validated['views_seen_at'] = now();
        }

        $link->update(Arr::except($validated, ['password', 'seen']));

        return back();
    }

    public function destroy(Resume $resume, ResumeShareLink $link)
    {
        $this->authorize('update', $resume);
        abort_if($link->resume_id !== $resume->id, 403);
        $link->delete();

        return back();
    }
}
