<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Per-user, all-time funnel and transition stats for the Job Application
 * Kanban, derived from the append-only job_application_status_events log.
 */
class JobApplicationStatsController extends Controller
{
    private const FUNNEL_ORDER = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $counts = $request->user()->jobApplications()
            ->toBase()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $funnel = array_map(
            fn (string $status) => ['status' => $status, 'count' => (int) ($counts[$status] ?? 0)],
            self::FUNNEL_ORDER,
        );

        $transitions = DB::table('job_application_status_events')
            ->join('job_applications', 'job_applications.id', '=', 'job_application_status_events.job_application_id')
            ->where('job_applications.user_id', $userId)
            ->selectRaw('job_application_status_events.from_status, job_application_status_events.to_status, count(*) as total, min(job_application_status_events.id) as first_seen')
            ->groupBy('job_application_status_events.from_status', 'job_application_status_events.to_status')
            ->orderBy('first_seen')
            ->get()
            ->map(fn ($row) => [
                'source' => $row->from_status ?? 'start',
                'target' => $row->to_status,
                'value' => (int) $row->total,
            ])
            ->all();

        return Inertia::render('Jobs/Stats', [
            'funnel' => $funnel,
            'transitions' => $transitions,
        ]);
    }
}
