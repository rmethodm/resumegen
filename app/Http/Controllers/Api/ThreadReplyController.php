<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VisitorThreadReply;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ThreadReplyController extends Controller
{
    public function store(Request $request, ResumeThread $thread): JsonResponse
    {
        $resume = $thread->resume;

        if ($resume->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = $thread->messages()->create([
            'body' => $validated['body'],
            'is_owner' => true,
        ]);

        $thread->update(['is_read' => true]);

        $shareLink = ResumeShareLink::find($thread->share_link_id)
            ?? $resume->shareLinks()->where('is_active', true)->first();

        if ($shareLink) {
            try {
                Mail::to($thread->sender_email)->queue(
                    new VisitorThreadReply($thread, $message, $resume, $shareLink)
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to queue visitor thread reply via API', [
                    'thread_id' => $thread->id,
                    'resume_id' => $resume->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'id' => $message->id,
            'body' => $message->body,
            'is_owner' => (bool) $message->is_owner,
            'created_at' => $message->created_at->toISOString(),
        ], 201);
    }
}
