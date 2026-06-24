<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResumeShareEvent;
use App\Models\ResumeThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $resumeIds = $request->user()->resumes()->pluck('id');

        $events = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->whereIn('event', ['page_view', 'pdf_download'])
            ->join('resumes', 'resumes.id', '=', 'resume_share_events.resume_id')
            ->select('resume_share_events.*', 'resumes.name as resume_name')
            ->latest('resume_share_events.created_at')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'type' => $e->event,
                'resume_id' => $e->resume_id,
                'resume_name' => $e->resume_name,
                'occurred_at' => $e->created_at->toISOString(),
            ]);

        $threads = ResumeThread::whereIn('resume_id', $resumeIds)
            ->with(['resume:id,name', 'messages' => fn ($q) => $q->orderBy('created_at')])
            ->get()
            ->sortByDesc(fn ($t) => ($t->messages->sortByDesc('created_at')->first()?->created_at ?? $t->created_at)->getTimestamp())
            ->values()
            ->map(function ($t) {
                $latestMessage = $t->messages->sortByDesc('created_at')->first();

                return [
                    'id' => $t->id,
                    'resume_id' => $t->resume_id,
                    'resume_name' => $t->resume->name,
                    'is_read' => $t->is_read,
                    'sender_name' => $t->sender_name,
                    'occurred_at' => ($latestMessage?->created_at ?? $t->created_at)->toISOString(),
                    'messages' => $t->messages->map(fn ($m) => [
                        'id' => $m->id,
                        'body' => $m->body,
                        'is_owner' => $m->is_owner,
                        'created_at' => $m->created_at->toISOString(),
                    ])->values(),
                ];
            });

        return response()->json([
            'events' => $events,
            'threads' => $threads,
            'unread_count' => $threads->where('is_read', false)->count(),
        ]);
    }
}
