<?php

namespace App\Http\Controllers;

use App\Models\JobApplicationInterview;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use App\Support\ResumeFillProfile;
use App\Support\RoleSamples;
use App\Support\ScoredResumes;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $hasStarterProfile = $user->starterProfile()->exists();

        // Both deferred resume props resolve in the same partial reload; load
        // and score the resumes once for the two of them.
        $scored = null;
        $scoredResumes = function () use ($user, &$scored): array {
            if ($scored === null) {
                $resumes = ScoredResumes::load($user, [
                    'group',
                    'shareLink' => fn ($query) => $query->withCount('views'),
                ]);
                $scored = [$resumes, ScoredResumes::scores($resumes)];
            }

            return $scored;
        };

        // One conditional aggregate instead of two counts; CASE works on
        // SQLite and PostgreSQL alike.
        $jobCounts = $user->jobApplications()
            ->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw(
                'sum(case when status in (?, ?, ?, ?) then 1 else 0 end) as applied',
                ['applied', 'interviewing', 'offer', 'rejected'],
            )
            ->first();

        return Inertia::render('Dashboard', [
            // Deferred: scores every version server-side and scales with the
            // user's resume count. Payload is intentionally lean — badge-level
            // share only, no full document preview (unused on this page). Full
            // share modal data is loaded on demand via resumes.share.show.
            'resumes' => Inertia::defer(fn () => $this->resumesForDashboard(...$scoredResumes())),
            'nextUp' => Inertia::defer(fn () => $this->nextUp($user)),
            // Deferred: same scoring cost as `resumes` above, but this only
            // feeds a <select> inside a modal that starts closed.
            'resumeOptions' => Inertia::defer(fn () => ScoredResumes::options(...$scoredResumes())),
            'prefersApplyWizard' => (bool) $user->prefers_apply_wizard,
            'hasStarterProfile' => $hasStarterProfile,
            'roleSamples' => RoleSamples::catalogue(),
            'checklist' => [
                'dismissed' => $user->dismissed_checklist_at !== null,
                'facts' => [
                    'has_starter_profile' => $hasStarterProfile,
                    'resume_count' => $user->resumes()->count(),
                    'extension_connected' => $user->tokens()
                        ->where('abilities', 'like', '%'.ResumeFillProfile::TOKEN_ABILITY.'%')
                        ->exists(),
                    'job_count' => (int) $jobCounts->total,
                    'applied_count' => (int) $jobCounts->applied,
                ],
            ],
        ]);
    }

    /**
     * Actionable items for the "Next up" strip. Order: overdue follow-ups,
     * upcoming interviews, saved applications to prepare, cards with no resume.
     * Preparation opens the attached resume; other items highlight the card.
     *
     * @return list<array{kind: string, label: string, detail: string, href: string}>
     */
    private function nextUp(User $user): array
    {
        $items = [];

        $followUps = $user->jobApplications()
            ->whereIn('status', ['saved', 'applied', 'interviewing', 'offer'])
            ->whereNotNull('follow_up_at')
            ->whereDate('follow_up_at', '<=', today())
            ->orderBy('follow_up_at')
            ->limit(5)
            ->get();

        foreach ($followUps as $job) {
            $items[] = [
                'kind' => 'follow_up',
                'label' => "Follow up: {$job->company} – {$job->role}",
                'detail' => $job->follow_up_at->isToday() ? 'Due today' : 'Overdue since '.$job->follow_up_at->toFormattedDateString(),
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        $interviews = JobApplicationInterview::query()
            ->whereHas('jobApplication', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'rejected'))
            ->whereBetween('scheduled_at', [now(), now()->addDays(7)])
            ->with('jobApplication')
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get();

        foreach ($interviews as $interview) {
            $job = $interview->jobApplication;
            $items[] = [
                'kind' => 'interview',
                'label' => "Interview: {$job->company} – {$job->role}",
                'detail' => $interview->scheduled_at->diffForHumans(),
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        $scheduledJobIds = $followUps->pluck('id')
            ->merge($interviews->pluck('job_application_id'))->unique()->all();

        $preparation = $user->jobApplications()
            ->where('status', 'saved')
            ->whereNotIn('id', $scheduledJobIds)
            ->where(fn ($query) => $query->whereNull('follow_up_at')->orWhereDate('follow_up_at', '<=', today()))
            ->oldest()
            ->limit(5)
            ->get();

        foreach ($preparation as $job) {
            $items[] = [
                'kind' => 'prepare',
                'label' => "Prepare application: {$job->company} – {$job->role}",
                'detail' => $job->resume_id !== null
                    ? 'Review your resume against the job, then apply'
                    : 'Review the job details and choose a resume',
                'href' => $job->resume_id !== null
                    ? route('resumes.workstation', $job->resume_id)
                    : route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        $unattached = $user->jobApplications()
            ->whereNull('resume_id')
            ->whereIn('status', ['applied', 'interviewing', 'offer'])
            ->whereNotIn('id', $scheduledJobIds)
            ->latest()
            ->limit(5)
            ->get();

        foreach ($unattached as $job) {
            $items[] = [
                'kind' => 'unattached',
                'label' => "No resume attached: {$job->company} – {$job->role}",
                'detail' => 'Link the resume used for this application',
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        return $items;
    }

    /**
     * @param  Collection<int, Resume>  $resumes  newest first
     * @param  array<int, int>  $scores  keyed by resume id
     * @return list<array<string, mixed>>
     */
    private function resumesForDashboard(Collection $resumes, array $scores): array
    {
        return $resumes
            ->groupBy('group_id')
            ->map(function ($versions) use ($scores): array {
                /** @var Resume $representative */
                $representative = $versions->first(); // newest — the query is latest-first
                $baseId = $versions->min('id');

                return [
                    'id' => $representative->id,
                    'group_id' => $representative->group_id,
                    'title' => $representative->title,
                    'group_title' => $representative->group?->title ?? $representative->title,
                    'target_role' => $representative->target_role,
                    'updated_at' => $representative->updated_at?->diffForHumans(),
                    'score' => $scores[$representative->id],
                    'version_count' => $versions->count(),
                    'share' => $this->shareBadge($representative->shareLink),
                    'versions' => $versions
                        ->map(fn (Resume $version): array => [
                            'id' => $version->id,
                            'title' => $version->title,
                            'target_company' => $version->target_company,
                            'score' => $scores[$version->id],
                            'is_base' => $version->id === $baseId,
                            'share' => $this->shareBadge($version->shareLink),
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Badge fields for list/status UI only — no password, no view rows.
     * ShareResumeModal loads the full payload via resumes.share.show.
     *
     * @return array{
     *     id: int,
     *     url: string,
     *     require_password: bool,
     *     require_email: bool,
     *     expires_at: string|null,
     *     view_count: int,
     *     is_expired: bool
     * }|null
     */
    private function shareBadge(?ResumeShareLink $link): ?array
    {
        if ($link === null) {
            return null;
        }

        return [
            'id' => $link->id,
            'url' => route('share.show', $link->token),
            'require_password' => $link->require_password,
            'require_email' => $link->require_email,
            'expires_at' => $link->expires_at?->toDateString(),
            'view_count' => (int) ($link->views_count ?? 0),
            'is_expired' => $link->isExpired(),
        ];
    }
}
