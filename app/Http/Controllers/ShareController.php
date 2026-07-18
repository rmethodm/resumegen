<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

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
            ->with('resume:id,name')
            ->withCount('threads')
            ->orderByDesc('is_primary')
            ->orderByDesc('created_at')
            ->get();

        // ponytail: one query, aggregated in PHP. A personal account has hundreds of
        // events, not millions. Push to grouped SQL if this ever gets slow.
        $events = ResumeShareEvent::query()
            ->whereIn('resume_share_link_id', $links->pluck('id'))
            ->where('event', 'page_view')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('resume_share_link_id');

        return Inertia::render('Shares/Index', [
            'links' => $links->map(fn (ResumeShareLink $link) => $this->presentLink(
                $link,
                $events->get($link->id) ?? collect(),
            ))->values(),
            'resumes' => Resume::where('user_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * @param  Collection<int, ResumeShareEvent>  $events
     * @return array<string, mixed>
     */
    private function presentLink(ResumeShareLink $link, Collection $events): array
    {
        $seenAt = $link->views_seen_at;

        return [
            'id' => $link->id,
            'resume_id' => $link->resume_id,
            'resume_name' => $link->resume?->name ?? '(deleted)',
            'label' => $link->label,
            'url' => route('public.resume', $link->token),
            'is_active' => $link->is_active && ! $link->expires_at?->isPast(),
            'is_primary' => $link->is_primary,
            'has_password' => $link->password_hash !== null,
            'expires_at' => $link->expires_at?->toDateString(),
            'views' => $events->count(),
            'visitors' => $events->pluck('ip_hash')->filter()->unique()->count(),
            'unread' => $seenAt
                ? $events->filter(fn ($e) => $e->created_at->gt($seenAt))->count()
                : $events->count(),
            'questions' => $link->threads_count,
            'trend' => $this->trend($events),
            'visits' => $events->take(self::VISITS_PER_LINK)->map(fn (ResumeShareEvent $e) => [
                'id' => $e->id,
                'location' => collect([$e->city, $e->country])->filter()->implode(', ') ?: '—',
                'when' => $e->created_at->toDayDateTimeString(),
                'source' => $this->source($e->referrer),
                'duration' => $e->duration_ms ? $this->humanDuration($e->duration_ms) : '—',
            ])->values(),
        ];
    }

    /**
     * Page views per day for the last TREND_DAYS days, oldest first.
     *
     * @param  Collection<int, ResumeShareEvent>  $events
     * @return list<int>
     */
    private function trend(Collection $events): array
    {
        $byDay = $events->countBy(fn (ResumeShareEvent $e) => $e->created_at->toDateString());

        return collect(range(self::TREND_DAYS - 1, 0))
            ->map(fn (int $ago) => $byDay->get(Carbon::today()->subDays($ago)->toDateString(), 0))
            ->all();
    }

    private function source(?string $referrer): string
    {
        if (! $referrer) {
            return 'Direct';
        }

        $host = parse_url($referrer, PHP_URL_HOST);

        return $host ? preg_replace('/^www\./', '', $host) : 'Direct';
    }

    private function humanDuration(int $ms): string
    {
        $seconds = (int) round($ms / 1000);

        return intdiv($seconds, 60).'m '.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT).'s';
    }
}
