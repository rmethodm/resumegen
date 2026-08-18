<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Support\ResumeAnalysis;
use App\Support\RoleSamples;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Dashboard', [
            // Deferred: scores every version server-side and scales with the
            // user's resume count. Payload is intentionally lean — badge-level
            // share only, no full document preview (unused on this page). Full
            // share modal data is loaded on demand via resumes.share.show.
            'resumes' => Inertia::defer(fn () => $this->resumesForDashboard($request)),
            'hasStarterProfile' => $request->user()->starterProfile()->exists(),
            'roleSamples' => RoleSamples::catalogue(),
        ]);
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
