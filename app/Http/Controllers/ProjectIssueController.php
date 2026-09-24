<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class ProjectIssueController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Projects/Issues/Index');
    }

    public function kanban(): Response
    {
        return Inertia::render('Projects/Issues/Kanban');
    }
}
