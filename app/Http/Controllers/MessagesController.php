<?php

namespace App\Http\Controllers;

use App\Models\ResumeThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $threads = ResumeThread::query()
            ->whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->with(['resume:id,name', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'resume_id' => $t->resume_id,
                'resume_name' => $t->resume?->name ?? '(deleted)',
                'sender_name' => $t->sender_name,
                'sender_email' => $t->sender_email,
                'is_read' => $t->is_read,
                'preview' => $t->messages->first()?->body ?? '',
                'message_count' => $t->messages()->count(),
                'created_at' => $t->created_at->toDateTimeString(),
            ]);

        return Inertia::render('Messages/Index', ['messages' => $threads]);
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();

        ResumeThread::whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return back();
    }
}
