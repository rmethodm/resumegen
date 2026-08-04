<?php

namespace App\Http\Controllers;

use App\Models\Resume;
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
            ->with(['experiences', 'skills', 'projects', 'education', 'certificates', 'group'])
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
}
