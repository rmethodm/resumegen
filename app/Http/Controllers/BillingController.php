<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Subscription checkout/portal plus AI credit pack purchase stub.
 * `STRIPE_PRICE_ID` is the $9.95 placeholder plan; `STRIPE_CREDITS_PRICE_ID`
 * enables one-time credit Checkout when set.
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

    public function credits(Request $request): RedirectResponse
    {
        $priceId = config('cashier.credits_price_id');

        if (blank($priceId)) {
            return back()->with('error', 'AI credit packs coming soon');
        }

        return $request->user()->checkout([$priceId => 1], [
            'success_url' => route('dashboard'),
            'cancel_url' => route('dashboard'),
        ]);
    }
}
