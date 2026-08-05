<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * UI-shell preview only — demo data lives client-side in the React page.
 * Linked from the nav so it's reachable, but every action on the page is a
 * stub. Job import/matching/tailoring/cover letters are removed features
 * (see CLAUDE.md "Removed Features"); do not add backend logic here without
 * an explicit product decision to bring them back.
 */
class JobImportsPreviewController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Jobs/ImportsPreview');
    }
}
