<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'users_count' => User::query()->count(),
            'signups_last_7_days' => User::query()
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
            'disabled_count' => User::query()
                ->whereNotNull('disabled_at')
                ->count(),
        ]);
    }
}
