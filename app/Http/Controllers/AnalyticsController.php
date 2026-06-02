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

        // Single query: fetch the minimal columns needed for all aggregations
        $rawEvents = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->select('resume_id', 'event', 'ip_hash', DB::raw('DATE(created_at) as event_date'))
            ->get()
            ->groupBy('resume_id');

        // Compute both event-type totals and unique-visitor counts from the one result set
        $totals = $rawEvents->map(fn ($rows) => $rows->groupBy('event'));

        $uniqueVisitors = $rawEvents->map(
            fn ($rows) => $rows
                ->where('event', 'page_view')
                ->whereNotNull('ip_hash')
                ->map(fn ($r) => $r->ip_hash.$r->event_date)
                ->unique()
                ->count()
        );

        $resumes = Resume::whereIn('id', $resumeIds)
            ->orderByDesc('updated_at')
            ->get(['id', 'name']);

        $stats = $resumes->map(function (Resume $resume) use ($totals, $uniqueVisitors) {
            $byType = $totals->get($resume->id, collect());

            return [
                'resume_id' => $resume->id,
                'resume_name' => $resume->name,
                'page_views' => (int) ($byType->get('page_view', collect())->count()),
                'unique_visitors' => (int) ($uniqueVisitors->get($resume->id, 0)),
                'pdf_downloads' => (int) ($byType->get('pdf_download', collect())->count()),
                'questions_submitted' => (int) ($byType->get('question_submitted', collect())->count()),
            ];
        });

        return Inertia::render('Dashboard', [
            'resumeStats' => $stats,
            'resumeCount' => Resume::where('user_id', $userId)->count(),
        ]);
    }
}
