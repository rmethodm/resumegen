<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralEvent;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminReferralController extends Controller
{
    public function index(): Response
    {
        $events = ReferralEvent::with([
            'referrer:id,name,email',
            'referred:id,name,email',
        ])->latest('created_at')->paginate(30);

        $leaderboard = User::where('referral_rewards_earned', '>', 0)
            ->select('id', 'name', 'email', 'referral_rewards_earned')
            ->selectRaw('(SELECT COUNT(*) FROM referral_events WHERE referrer_user_id = users.id) as total_referrals')
            ->selectRaw("(SELECT COUNT(*) FROM referral_events WHERE referrer_user_id = users.id AND event_type = 'upgrade') as upgrade_count")
            ->orderByDesc('referral_rewards_earned')
            ->limit(20)
            ->get();

        return Inertia::render('Admin/Referrals/Index', [
            'events' => $events,
            'leaderboard' => $leaderboard,
        ]);
    }
}
