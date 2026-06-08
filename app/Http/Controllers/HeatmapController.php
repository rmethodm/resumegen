<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeSectionEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HeatmapController extends Controller
{
    public function show(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $sections = ResumeSectionEvent::query()
            ->where('resume_id', $resume->id)
            ->selectRaw('section, COUNT(*) as view_count, AVG(dwell_ms) as avg_dwell_ms')
            ->groupBy('section')
            ->orderByDesc('view_count')
            ->get()
            ->map(fn ($row) => [
                'section' => $row->section,
                'view_count' => (int) $row->view_count,
                'avg_dwell_ms' => (float) $row->avg_dwell_ms,
            ])
            ->all();

        return Inertia::render('ResumeBuilder/Heatmap', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'sections' => $sections,
        ]);
    }
}
