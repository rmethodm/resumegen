<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectIssueController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Projects/Issues/Index');
    }

    public function kanban(Request $request)
    {
        return Inertia::render('Projects/Issues/Kanban');
    }
}
