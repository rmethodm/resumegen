<?php

namespace App\Http\Controllers;

use App\Mail\VisitorThreadReply;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class ResumeThreadController extends Controller
{
    public function show(Request $request, Resume $resume, ResumeThread $thread): Response
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->load('messages');

        return Inertia::render('ResumeBuilder/Thread', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'thread' => [
                'id' => $thread->id,
                'sender_name' => $thread->sender_name,
                'sender_email' => $thread->sender_email,
                'is_read' => $thread->is_read,
                'created_at' => $thread->created_at->toDateTimeString(),
                'messages' => $thread->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'is_owner' => $m->is_owner,
                    'created_at' => $m->created_at->toDateTimeString(),
                ]),
            ],
        ]);
    }

    public function reply(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $ownerMessage = $thread->messages()->create([
            'body' => $validated['body'],
            'is_owner' => true,
        ]);

        $thread->update(['is_read' => true]);

        $shareLink = ResumeShareLink::find($thread->share_link_id)
            ?? $resume->shareLinks()->where('is_active', true)->first()
            ?? $resume->shareLinks()->first();

        if ($shareLink) {
            try {
                Mail::to($thread->sender_email)->queue(
                    new VisitorThreadReply($thread, $ownerMessage, $resume, $shareLink)
                );
            } catch (\Throwable $e) {
                // Log mail failure but don't block the reply
                Log::warning('Failed to queue visitor thread reply', [
                    'thread_id' => $thread->id,
                    'resume_id' => $resume->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return back();
    }

    public function read(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->update(['is_read' => true]);

        return back();
    }

    public function destroy(Request $request, Resume $resume, ResumeThread $thread): RedirectResponse
    {
        $this->authorize('update', $resume);
        abort_if($thread->resume_id !== $resume->id, 403);

        $thread->delete();

        return redirect()->route('messages.index');
    }
}
