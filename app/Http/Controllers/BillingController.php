<?php

namespace App\Http\Controllers;

use App\Services\AiUsageLimiter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Subscription checkout/portal plus AI credit pack purchase stub.
 * `STRIPE_PRICE_ID` is the $9.95 plan; `STRIPE_CREDITS_PRICE_ID`
 * enables one-time credit Checkout when set (subscribers only).
 */
class BillingController extends Controller
{
    public function checkout(Request $request): RedirectResponse
    {
        return $request->user()
            ->newSubscription('default', config('cashier.price_id'))
            ->checkout([
                'success_url' => route('dashboard'),
                'cancel_url' => route('dashboard'),
            ]);
    }

    public function portal(Request $request): RedirectResponse
    {
        return $request->user()->redirectToBillingPortal(route('dashboard'));
    }

    public function credits(Request $request, AiUsageLimiter $limiter): RedirectResponse
    {
        // Do not set STRIPE_CREDITS_PRICE_ID until a checkout.session.completed
        // (or equivalent) listener grants ledger credits — Checkout alone charges without crediting.
        $priceId = config('cashier.credits_price_id');

        if (blank($priceId)) {
            return back()->with('error', 'AI credit packs coming soon');
        }

        $user = $request->user();

        if ($user->ai_blocked) {
            return back()->with('error', 'AI credit purchases are unavailable for your account');
        }

        if (! $limiter->subscribedForAi($user)) {
            return back()->with('error', 'Subscribe to purchase AI credits');
        }

        return $user->checkout([$priceId => 1], [
            'success_url' => route('dashboard'),
            'cancel_url' => route('dashboard'),
        ]);
    }
}
