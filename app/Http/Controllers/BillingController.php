<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $subscribed = $user->isPro();

        return Inertia::render('Billing/Index', [
            'plan'        => $subscribed ? 'pro' : 'free',
            'resumeCount' => $user->resumes()->count(),
            'resumeLimit' => $subscribed ? null : 5,
            'limitReached' => session('limitReached', false),
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $request->validate(['interval' => ['required', 'in:monthly,yearly']]);

        $priceId = $request->interval === 'yearly'
            ? config('services.stripe.yearly_price_id')
            : config('services.stripe.monthly_price_id');

        $checkout = $request->user()->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => route('builder.index'),
                'cancel_url'  => route('billing.index'),
            ]);

        return redirect($checkout->url);
    }

    public function portal(Request $request): RedirectResponse
    {
        return $request->user()->redirectToBillingPortal(route('billing.index'));
    }
}
