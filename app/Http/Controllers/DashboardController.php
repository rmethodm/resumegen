<?php

namespace App\Http\Controllers;

use App\Models\JobApplicationInterview;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use App\Support\ResumeAnalysis;
use App\Support\ResumeFillProfile;
use App\Support\RoleSamples;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Dashboard', [
            // Deferred: scores every version server-side and scales with the
            // user's resume count. Payload is intentionally lean — badge-level
            // share only, no full document preview (unused on this page). Full
            // share modal data is loaded on demand via resumes.share.show.
            'resumes' => Inertia::defer(fn () => $this->resumesForDashboard($request)),
            'nextUp' => Inertia::defer(fn () => $this->nextUp($user)),
            'resumeOptions' => $user->resumes()
                ->with(['experiences', 'skills'])
                ->latest('updated_at')
                ->get()
                ->map(fn (Resume $resume): array => [
                    'id' => $resume->id,
                    'title' => $resume->title,
                    'score' => ResumeAnalysis::score($resume),
                ])->all(),
            'prefersApplyWizard' => (bool) $user->prefers_apply_wizard,
            'hasStarterProfile' => $user->starterProfile()->exists(),
            'roleSamples' => RoleSamples::catalogue(),
            'checklist' => [
                'dismissed' => $user->dismissed_checklist_at !== null,
                'facts' => [
                    'has_starter_profile' => $user->starterProfile()->exists(),
                    'resume_count' => $user->resumes()->count(),
                    'extension_connected' => $user->tokens()
                        ->where('abilities', 'like', '%'.ResumeFillProfile::TOKEN_ABILITY.'%')
                        ->exists(),
                    'job_count' => $user->jobApplications()->count(),
                    'applied_count' => $user->jobApplications()->whereIn('status', ['applied', 'interviewing', 'offer', 'rejected'])->count(),
                ],
            ],
        ]);
    }

    /**
     * Actionable items for the "Next up" strip. Order: overdue follow-ups,
     * upcoming interviews, cards with no resume. Each links straight to the
     * card (Kanban ?highlight) so the user lands on the thing to do.
     *
     * @return list<array{kind: string, label: string, detail: string, href: string}>
     */
    private function nextUp(User $user): array
    {
        $items = [];

        $followUps = $user->jobApplications()
            ->whereIn('status', ['saved', 'applied'])
            ->whereNotNull('follow_up_at')
            ->whereDate('follow_up_at', '<=', today())
            ->orderBy('follow_up_at')
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
            ->whereHas('jobApplication', fn ($q) => $q->where('user_id', $user->id))
            ->whereBetween('scheduled_at', [now(), now()->addDays(7)])
            ->with('jobApplication')
            ->orderBy('scheduled_at')
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

        $unattached = $user->jobApplications()
            ->whereNull('resume_id')
            ->whereIn('status', ['saved', 'applied', 'interviewing'])
            ->latest()
            ->get();

        foreach ($unattached as $job) {
            $items[] = [
                'kind' => 'unattached',
                'label' => "No resume attached: {$job->company} – {$job->role}",
                'detail' => 'Attach or create a tailored version',
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function resumesForDashboard(Request $request): array
    {
        // Score only needs experiences + skills (plus scalars on the resume row).
        // projects / education / certificates are not scored and are not rendered here.
        return $request->user()->resumes()
            ->with([
                'experiences',
                'skills',
                'group',
                'shareLink' => fn ($query) => $query->withCount('views'),
            ])
            ->latest('updated_at')
            ->get()
            ->groupBy('group_id')
            ->map(function ($versions): array {
                /** @var Resume $representative */
                $representative = $versions->first(); // newest — the query is latest-first
                $baseId = $versions->min('id');

                return [
                    'id' => $representative->id,
                    'group_id' => $representative->group_id,
                    // Seeders / WithoutModelEvents can leave group_id null; fall
                    // back to the resume title so the dashboard still renders.
                    'title' => $representative->group?->title ?? $representative->title,
                    'target_role' => $representative->target_role,
                    'updated_at' => $representative->updated_at?->diffForHumans(),
                    'score' => ResumeAnalysis::score($representative),
                    'version_count' => $versions->count(),
                    'share' => $this->shareBadge($representative->shareLink),
                    'versions' => $versions
                        ->map(fn (Resume $version): array => [
                            'id' => $version->id,
                            'title' => $version->title,
                            'target_company' => $version->target_company,
                            'score' => ResumeAnalysis::score($version),
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
