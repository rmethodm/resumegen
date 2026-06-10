<?php

namespace App\Http\Controllers;

use App\Services\UserLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Billing/Index', [
            'plan' => $user->planTier(),
            'resumeCount' => $user->resumes()->count(),
            'resumeLimit' => UserLimits::resumeLimit($user),
            'limitReached' => session('limitReached', false),
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $request->validate([
            'interval' => ['required', 'in:monthly,yearly'],
            'tier' => ['required', 'in:starter,pro,agency'],
        ]);

        $key = $request->tier.'_'.$request->interval.'_price_id';
        $priceId = config("services.stripe.{$key}");

        $checkout = $request->user()->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => route('builder.index'),
                'cancel_url' => route('billing.index'),
            ]);

        return redirect($checkout->url);
    }

    public function portal(Request $request): RedirectResponse
    {
        return $request->user()->redirectToBillingPortal(route('billing.index'));
    }
}
