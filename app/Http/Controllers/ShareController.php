<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeShareLinkView;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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
            ->with(['resume:id,title', 'views'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Shares/Index', [
            'links' => $links->map(fn (ResumeShareLink $link) => $this->presentLink($link))->values(),
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
     * @return array<string, mixed>
     */
    private function presentLink(ResumeShareLink $link): array
    {
        /** @var Collection<int, ResumeShareLinkView> $views */
        $views = $link->views->sortByDesc('created_at')->values();

        return [
            'id' => $link->id,
            'resume_id' => $link->resume_id,
            'resume_name' => $link->resume?->title ?? '(deleted)',
            'url' => route('share.show', $link->token),
            'is_active' => ! $link->isExpired(),
            'has_password' => (bool) $link->require_password,
            'expires_at' => $link->expires_at?->toDateString(),
            'expires_human' => $this->expiresHuman($link),
            'views' => $views->count(),
            'visitors' => $views->pluck('email')->filter()->unique()->count(),
            'trend' => $this->trend($views),
            'visits' => $views->take(self::VISITS_PER_LINK)->map(fn (ResumeShareLinkView $view) => [
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
     * Page views per day for the last TREND_DAYS days, oldest first.
     *
     * @param  Collection<int, ResumeShareLinkView>  $views
     * @return list<int>
     */
    private function trend(Collection $views): array
    {
        $byDay = $views->countBy(fn (ResumeShareLinkView $view) => $view->created_at?->toDateString() ?? '');

        return collect(range(self::TREND_DAYS - 1, 0))
            ->map(fn (int $ago) => $byDay->get(Carbon::today()->subDays($ago)->toDateString(), 0))
            ->all();
    }
}
