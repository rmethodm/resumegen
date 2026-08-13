<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Services\ResumeStrengthScorer;
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
                DB::raw("SUM(CASE WHEN event IN ('pdf_download', 'docx_download') THEN 1 ELSE 0 END) as pdf_downloads"),
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
                SUM(CASE WHEN resume_share_events.event IN ('pdf_download', 'docx_download') THEN 1 ELSE 0 END) as downloads"
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

        $cardResumes = Resume::where('user_id', $userId)
            ->nonSnapshot()
            ->orderByDesc('updated_at')
            ->get();

        $cardIds = $cardResumes->pluck('id');

        $activeShareResumeIds = ResumeShareLink::where('is_active', true)
            ->whereIn('resume_id', $cardIds)
            ->pluck('resume_id')
            ->flip();

        $variantCounts = Resume::whereIn('ab_parent_id', $cardIds)
            ->selectRaw('ab_parent_id, COUNT(*) as cnt')
            ->groupBy('ab_parent_id')
            ->pluck('cnt', 'ab_parent_id');

        // ponytail: job_applications has no Eloquent model (feature dark), query the table directly
        $activeApplicationCounts = DB::table('job_applications')
            ->whereIn('resume_id', $cardIds)
            ->whereNotIn('status', ['rejected', 'closed'])
            ->selectRaw('resume_id, COUNT(*) as cnt')
            ->groupBy('resume_id')
            ->pluck('cnt', 'resume_id');

        $resumeCards = $cardResumes->map(function (Resume $resume) use ($activeShareResumeIds, $variantCounts, $activeApplicationCounts) {
            $cacheKey = "strength:{$resume->id}:".$resume->updated_at->timestamp;
            $strength = cache()->remember($cacheKey, now()->addMinutes(5), fn () => ResumeStrengthScorer::score($resume));

            return [
                'id' => $resume->id,
                'name' => $resume->name,
                'updated_at' => $resume->updated_at,
                'strength' => $strength['score'],
                'has_active_share_link' => isset($activeShareResumeIds[$resume->id]),
                'variant_count' => (int) ($variantCounts[$resume->id] ?? 0),
                'active_applications' => (int) ($activeApplicationCounts[$resume->id] ?? 0),
            ];
        });

        return Inertia::render('Dashboard', [
            'resumeStats' => $stats,
            'resumeCards' => $resumeCards,
            'resumeCount' => Resume::where('user_id', $userId)->nonSnapshot()->count(),
            'templateStats' => $templateStats,
        ]);
    }
}
