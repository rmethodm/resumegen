<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Support\ResumeAnalysis;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Step-by-step "Add job" for first-timers. Submits to the same
 * job-applications.store endpoint as the modal; this controller only
 * renders the page.
 */
class ApplyWizardController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('Apply/Wizard', [
            'resumeOptions' => $request->user()->resumes()
                ->with(['experiences', 'skills'])
                ->latest('updated_at')
                ->get()
                ->map(fn (Resume $resume): array => [
                    'id' => $resume->id,
                    'title' => $resume->title,
                    'score' => ResumeAnalysis::score($resume),
                ])->all(),
        ]);
    }
}
