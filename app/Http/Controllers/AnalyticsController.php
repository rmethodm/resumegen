<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        // Get all resume IDs belonging to this user
        $resumeIds = Resume::where('user_id', $userId)->pluck('id');

        // Raw event totals per resume per event type
        $totals = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->select('resume_id', 'event', DB::raw('COUNT(*) as total'))
            ->groupBy('resume_id', 'event')
            ->get()
            ->groupBy('resume_id');

        // Unique visitors per resume: distinct ip_hash+date combinations
        $uniqueVisitors = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->where('event', 'page_view')
            ->whereNotNull('ip_hash')
            ->select('resume_id', DB::raw('COUNT(DISTINCT ip_hash || DATE(created_at)) as unique_visitors'))
            ->groupBy('resume_id')
            ->pluck('unique_visitors', 'resume_id');

        $resumes = Resume::whereIn('id', $resumeIds)
            ->orderByDesc('updated_at')
            ->get(['id', 'name']);

        $stats = $resumes->map(function (Resume $resume) use ($totals, $uniqueVisitors) {
            $events = $totals->get($resume->id, collect());
            $byType = $events->pluck('total', 'event');

            return [
                'resume_id' => $resume->id,
                'resume_name' => $resume->name,
                'page_views' => (int) ($byType['page_view'] ?? 0),
                'unique_visitors' => (int) ($uniqueVisitors[$resume->id] ?? 0),
                'pdf_downloads' => (int) ($byType['pdf_download'] ?? 0),
                'questions_submitted' => (int) ($byType['question_submitted'] ?? 0),
            ];
        });

        return Inertia::render('Dashboard', [
            'resumeStats' => $stats,
        ]);
    }
}
