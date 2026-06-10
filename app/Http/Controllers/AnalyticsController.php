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
        $resumeIds = Resume::where('user_id', $userId)->pluck('id');

        $aggregates = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->select(
                'resume_id',
                DB::raw("SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) as page_views"),
                DB::raw("SUM(CASE WHEN event = 'pdf_download' THEN 1 ELSE 0 END) as pdf_downloads"),
                DB::raw("SUM(CASE WHEN event = 'question_submitted' THEN 1 ELSE 0 END) as questions_submitted"),
                DB::raw("COUNT(DISTINCT CASE WHEN event = 'page_view' AND ip_hash IS NOT NULL THEN ip_hash || DATE(created_at) END) as unique_visitors")
            )
            ->groupBy('resume_id')
            ->get()
            ->keyBy('resume_id');

        $resumes = Resume::whereIn('id', $resumeIds)
            ->orderByDesc('updated_at')
            ->get(['id', 'name']);

        $stats = $resumes->map(function (Resume $resume) use ($aggregates) {
            $agg = $aggregates->get($resume->id);

            return [
                'resume_id' => $resume->id,
                'resume_name' => $resume->name,
                'page_views' => (int) ($agg?->page_views ?? 0),
                'unique_visitors' => (int) ($agg?->unique_visitors ?? 0),
                'pdf_downloads' => (int) ($agg?->pdf_downloads ?? 0),
                'questions_submitted' => (int) ($agg?->questions_submitted ?? 0),
            ];
        });

        $templateStats = ResumeShareEvent::query()
            ->join('resumes', 'resume_share_events.resume_id', '=', 'resumes.id')
            ->whereIn('resume_share_events.resume_id', $resumeIds)
            ->selectRaw(
                "resumes.template,
                SUM(CASE WHEN resume_share_events.event = 'page_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN resume_share_events.event = 'pdf_download' THEN 1 ELSE 0 END) as downloads"
            )
            ->groupBy('resumes.template')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($row) => [
                'template' => $row->template,
                'views' => (int) $row->views,
                'downloads' => (int) $row->downloads,
            ])
            ->values()
            ->all();

        return Inertia::render('Dashboard', [
            'resumeStats' => $stats,
            'resumeCount' => Resume::where('user_id', $userId)->where('is_snapshot', false)->count(),
            'templateStats' => $templateStats,
        ]);
    }
}
