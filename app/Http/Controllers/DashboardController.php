<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Support\ResumeAnalysis;
use App\Support\ResumeDocument;
use App\Support\RoleSamples;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $resumes = $request->user()->resumes()
            ->with([
                'experiences',
                'skills',
                'projects',
                'education',
                'certificates',
                'group',
                'shareLink' => fn ($query) => $query
                    ->withCount('views')
                    ->with(['views' => fn ($views) => $views->latest('id')->limit(50)]),
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
                    'title' => $representative->group->title,
                    'target_role' => $representative->target_role,
                    'updated_at' => $representative->updated_at?->diffForHumans(),
                    'score' => ResumeAnalysis::score($representative),
                    'version_count' => $versions->count(),
                    // Full Share modal payload so the dashboard can open the same modal.
                    'share' => $this->shareSummary($representative->shareLink),
                    // The whole document, for the dashboard card's live preview —
                    // relations are already eager-loaded above, so this is free.
                    'preview' => ResumeDocument::toArray($representative),
                    'versions' => $versions
                        ->map(fn (Resume $version): array => [
                            'id' => $version->id,
                            'title' => $version->title,
                            'target_company' => $version->target_company,
                            'score' => ResumeAnalysis::score($version),
                            'is_base' => $version->id === $baseId,
                            'share' => $this->shareSummary($version->shareLink),
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values();

        return Inertia::render('Dashboard', [
            'resumes' => $resumes->all(),
            // Null rather than 0 when there is nothing to average, so the dial
            // shows an empty state instead of a score the user did not earn.
            'average_score' => $resumes->isEmpty()
                ? null
                : (int) round($resumes->avg('score')),
            'hasStarterProfile' => $request->user()->starterProfile()->exists(),
            'roleSamples' => RoleSamples::catalogue(),
        ]);
    }

    /**
     * Same shape as the workstation Share modal, plus is_expired for the badge.
     *
     * @return array{
     *     id: int,
     *     url: string,
     *     allow_download: bool,
     *     require_email: bool,
     *     require_password: bool,
     *     password: string|null,
     *     expires_at: string|null,
     *     views: list<array{email: string, viewed_at: string}>,
     *     view_count: int,
     *     is_expired: bool
     * }|null
     */
    private function shareSummary(?ResumeShareLink $link): ?array
    {
        if ($link === null) {
            return null;
        }

        return [
            'id' => $link->id,
            'url' => route('share.show', $link->token),
            'allow_download' => $link->allow_download,
            'require_email' => $link->require_email,
            'require_password' => $link->require_password,
            'password' => $link->password,
            'expires_at' => $link->expires_at?->toDateString(),
            'views' => $link->views
                ->map(fn ($view): array => [
                    'email' => $view->email,
                    'viewed_at' => $view->created_at?->toIso8601String() ?? '',
                ])
                ->all(),
            'view_count' => (int) ($link->views_count ?? $link->views->count()),
            'is_expired' => $link->isExpired(),
        ];
    }
}
