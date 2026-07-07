<?php

namespace App\Http\Controllers;

use App\Mail\NewThreadStarted;
use App\Mail\NewVisitorReply;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Services\PushNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PublicThreadController extends Controller
{
    public function store(Request $request, string $token): RedirectResponse
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $validated = $request->validate([
            'sender_name' => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $thread = ResumeThread::create([
            'resume_id' => $link->resume_id,
            'share_link_id' => $link->id,
            'sender_name' => $validated['sender_name'],
            'sender_email' => $validated['sender_email'],
        ]);

        $firstMessage = $thread->messages()->create([
            'body' => $validated['message'],
            'is_owner' => false,
        ]);

        $request->session()->push('owned_threads', $thread->id);

        ResumeShareEvent::log($request, $link, 'question_submitted');

        try {
            Mail::to($link->resume->user->email)->queue(
                new NewThreadStarted($thread, $firstMessage, $link->resume)
            );
        } catch (\Throwable $e) {
            // Log mail failure but don't break the public form
            Log::warning('Failed to queue new thread notification', [
                'thread_id' => $thread->id,
                'resume_id' => $link->resume_id,
                'error' => $e->getMessage(),
            ]);
        }

        PushNotifier::notify(
            $link->resume->user,
            'New message about '.$link->resume->name,
            Str::limit($validated['message'], 100),
            ['thread_id' => $thread->id],
        );

        return back()->with('threadStarted', true);
    }

    public function addMessage(Request $request, string $token, ResumeThread $thread): RedirectResponse
    {
        $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

        abort_if(
            ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
            410,
            'This link is no longer active.'
        );

        $ownedThreads = $request->session()->get('owned_threads', []);
        abort_unless(in_array($thread->id, $ownedThreads), 403);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $newMessage = $thread->messages()->create([
            'body' => $validated['message'],
            'is_owner' => false,
        ]);

        try {
            Mail::to($link->resume->user->email)->queue(
                new NewVisitorReply($thread, $newMessage, $link->resume)
            );
        } catch (\Throwable $e) {
            // Log mail failure but don't break the public form
            Log::warning('Failed to queue visitor reply notification', [
                'thread_id' => $thread->id,
                'resume_id' => $link->resume_id,
                'error' => $e->getMessage(),
            ]);
        }

        PushNotifier::notify(
            $link->resume->user,
            'New message about '.$link->resume->name,
            Str::limit($validated['message'], 100),
            ['thread_id' => $thread->id],
        );

        return back()->with('messageSent', true);
    }
}
