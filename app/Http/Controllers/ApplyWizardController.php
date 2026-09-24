<?php

namespace App\Http\Controllers;

use App\Support\ScoredResumes;
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
            'resumeOptions' => ScoredResumes::options(ScoredResumes::load($request->user())),
        ]);
    }
}
