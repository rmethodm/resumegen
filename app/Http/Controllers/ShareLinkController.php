<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Legacy share-link mutations used by Shares/Index. Ownership is checked
 * inline (this app has no ResumePolicy). Only columns that exist on
 * resume_share_links are written.
 */
class ShareLinkController extends Controller
{
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);

        $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        // label is accepted for UI compatibility but not stored — the column
        // was dropped with the shares schema rebuild. firstOrCreate because
        // resume_share_links.resume_id carries a DB unique index.
        $link = $resume->shareLinks()->firstOrCreate([]);

        return back()->with('newToken', $link->token);
    }

    public function update(Request $request, Resume $resume, ResumeShareLink $link): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        abort_if($link->resume_id !== $resume->id, 403);

        $validated = $request->validate([
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'resume_id' => ['sometimes', 'integer', 'exists:resumes,id'],
            'password' => ['sometimes', 'nullable', 'string', 'min:4', 'max:100'],
            'require_password' => ['sometimes', 'boolean'],
            'allow_download' => ['sometimes', 'boolean'],
            'require_email' => ['sometimes', 'boolean'],
            // Accepted no-ops for the Shares UI still posting them:
            'label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['resume_id']) && (int) $validated['resume_id'] !== $link->resume_id) {
            $target = Resume::query()->findOrFail($validated['resume_id']);
            abort_unless($target->user_id === $request->user()->id, 403);

            if (ResumeShareLink::query()->where('resume_id', $target->id)->exists()) {
                return back()->withErrors(['resume_id' => 'That resume already has a share link.']);
            }

            $link->resume_id = $target->id;
        }

        if (array_key_exists('expires_at', $validated)) {
            $link->expires_at = $validated['expires_at'];
        }

        if (array_key_exists('allow_download', $validated)) {
            $link->allow_download = (bool) $validated['allow_download'];
        }

        if (array_key_exists('require_email', $validated)) {
            $link->require_email = (bool) $validated['require_email'];
        }

        if (array_key_exists('password', $validated)) {
            if ($validated['password']) {
                $link->require_password = true;
                $link->password = $validated['password'];
            } else {
                $link->require_password = false;
                $link->password = null;
            }
        } elseif (array_key_exists('require_password', $validated) && ! $validated['require_password']) {
            $link->require_password = false;
            $link->password = null;
        }

        $link->save();

        return back();
    }

    public function destroy(Request $request, Resume $resume, ResumeShareLink $link): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        abort_if($link->resume_id !== $resume->id, 403);
        $link->delete();

        return back();
    }
}
