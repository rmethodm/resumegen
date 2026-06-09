<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModelRate;
use App\Models\CareerArticle;
use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\Organization;
use App\Models\PortfolioMessage;
use App\Models\ReferralEvent;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => User::count(),
                'organizations' => Organization::count(),
                'unread_messages' => PortfolioMessage::whereNull('read_at')->count(),
                'referral_conversions' => ReferralEvent::where('event_type', 'upgrade')->count(),
                'job_titles_count' => JobRole::count() + JobTitle::count(),
                'ai_rates_count' => AiModelRate::count(),
                'published_articles' => CareerArticle::where('is_published', true)->count(),
            ],
        ]);
    }
}
