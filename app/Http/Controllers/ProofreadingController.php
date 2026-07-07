<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProofreadingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Proofreading/Index', [
            'requests' => $user->proofreadingRequests()
                ->with('resume:id,name')
                ->orderByDesc('created_at')
                ->get(['id', 'resume_id', 'status', 'price_cents', 'feedback', 'created_at']),
            'resumes' => $user->resumes()->orderBy('name')->get(['id', 'name']),
            'priceCents' => config('services.stripe.proofreading_price_cents'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'resume_id' => ['nullable', 'integer', 'exists:resumes,id'],
        ]);

        if (! empty($validated['resume_id'])) {
            abort_unless($user->resumes()->whereKey($validated['resume_id'])->exists(), 403);
        }

        $priceId = config('services.stripe.proofreading_price_id');
        abort_if(! $priceId, 500, 'Stripe price not configured.');

        $proofreadingRequest = $user->proofreadingRequests()->create([
            'resume_id' => $validated['resume_id'] ?? null,
            'status' => 'pending',
            'price_cents' => config('services.stripe.proofreading_price_cents'),
        ]);

        $checkout = $user->checkout([$priceId => 1], [
            'success_url' => route('proofreading.index'),
            'cancel_url' => route('proofreading.index'),
            'metadata' => ['proofreading_request_id' => $proofreadingRequest->id],
        ]);

        $proofreadingRequest->update(['stripe_checkout_session_id' => $checkout->id]);

        return redirect($checkout->url);
    }
}
