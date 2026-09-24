<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeShareLinkView;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Share links index. Analytics use resume_share_link_views (the current
 * schema). Older resume_share_events / threads fields were dropped.
 */
class ShareController extends Controller
{
    /** Visitor rows shown in a link's detail modal. */
    private const VISITS_PER_LINK = 10;

    private const TREND_DAYS = 7;

    public function index(Request $request): Response
    {
        $user = $request->user();

        $links = ResumeShareLink::query()
            ->whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->with([
                'resume:id,title',
                'views' => fn ($q) => $q->select(['id', 'resume_share_link_id', 'email', 'created_at'])
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->limit(self::VISITS_PER_LINK),
            ])
            ->withCount([
                'views',
                'views as visitors_count' => fn ($q) => $q->select(DB::raw('count(distinct email)')),
            ])
            ->orderByDesc('created_at')
            ->get();

        $trends = $this->trends($links->modelKeys());

        return Inertia::render('Shares/Index', [
            'links' => $links->map(fn (ResumeShareLink $link) => $this->presentLink($link, $trends[$link->id] ?? []))->values(),
            // Only resumes that can still take a link: resume_share_links.resume_id
            // is unique, so a resume with a link cannot be offered for create/reassign.
            'resumes' => Resume::query()
                ->where('user_id', $user->id)
                ->whereDoesntHave('shareLinks')
                ->orderBy('title')
                ->get(['id', 'title'])
                ->map(fn (Resume $resume) => [
                    'id' => $resume->id,
                    'name' => $resume->title,
                ])
                ->values(),
        ]);
    }

    /**
     * @param  array<string, int>  $trendByDay  view counts keyed by Y-m-d
     * @return array<string, mixed>
     */
    private function presentLink(ResumeShareLink $link, array $trendByDay): array
    {

        return [
            'id' => $link->id,
            'resume_id' => $link->resume_id,
            'resume_name' => $link->resume?->title ?? '(deleted)',
            'url' => route('share.show', $link->token),
            'is_active' => ! $link->isExpired(),
            'has_password' => (bool) $link->require_password,
            'expires_at' => $link->expires_at?->toDateString(),
            'expires_human' => $this->expiresHuman($link),
            'views' => (int) $link->views_count,
            'visitors' => (int) $link->visitors_count,
            'trend' => $this->trend($trendByDay),
            'visits' => $link->views->map(fn (ResumeShareLinkView $view) => [
                'id' => $view->id,
                'email' => $view->email,
                'when' => $view->created_at?->diffForHumans() ?? '—',
                'when_exact' => $view->created_at?->toDayDateTimeString() ?? '—',
            ])->values(),
        ];
    }

    private function expiresHuman(ResumeShareLink $link): string
    {
        if ($link->expires_at === null) {
            return 'Never expires';
        }

        return $link->isExpired()
            ? 'Expired '.$link->expires_at->diffForHumans()
            : 'Expires '.$link->expires_at->diffForHumans();
    }

    /**
     * Per-link, per-day view counts for the trend window in one grouped query.
     * date() returns Y-m-d on both SQLite and PostgreSQL.
     *
     * @param  list<int>  $linkIds
     * @return array<int, array<string, int>>
     */
    private function trends(array $linkIds): array
    {
        if ($linkIds === []) {
            return [];
        }

        $trends = [];

        ResumeShareLinkView::query()
            ->selectRaw('resume_share_link_id, date(created_at) as day, count(*) as total')
            ->whereIn('resume_share_link_id', $linkIds)
            ->where('created_at', '>=', Carbon::today()->subDays(self::TREND_DAYS - 1))
            ->groupBy('resume_share_link_id', DB::raw('date(created_at)'))
            ->toBase()
            ->get()
            ->each(function (object $row) use (&$trends): void {
                $trends[(int) $row->resume_share_link_id][substr((string) $row->day, 0, 10)] = (int) $row->total;
            });

        return $trends;
    }

    /**
     * Page views per day for the last TREND_DAYS days, oldest first.
     *
     * @param  array<string, int>  $byDay
     * @return list<int>
     */
    private function trend(array $byDay): array
    {
        return collect(range(self::TREND_DAYS - 1, 0))
            ->map(fn (int $ago) => $byDay[Carbon::today()->subDays($ago)->toDateString()] ?? 0)
            ->all();
    }
}
