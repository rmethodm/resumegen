<?php

namespace App\Http\Controllers;

use App\Actions\EnsureReferralCode;
use App\Models\ReferralEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReferralController extends Controller
{
    public function redirect(Request $request, string $code): RedirectResponse
    {
        $referrer = User::where('referral_code', $code)->firstOrFail();

        $request->session()->put('referral_code', $referrer->referral_code);

        return redirect()->route('register');
    }

    public function show(Request $request): Response
    {
        $user = $request->user();
        $code = EnsureReferralCode::for($user);

        return Inertia::render('Referral/Index', [
            'referralCode' => $code,
            'referralUrl' => route('referral.redirect', $code),
            'totalSignups' => ReferralEvent::where('referrer_user_id', $user->id)->where('event_type', 'signup')->count(),
            'totalUpgrades' => ReferralEvent::where('referrer_user_id', $user->id)->where('event_type', 'upgrade')->count(),
            'rewardsEarned' => $user->referral_rewards_earned,
        ]);
    }
}
