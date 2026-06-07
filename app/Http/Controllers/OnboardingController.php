<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        if ($request->user()->has_completed_onboarding) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Onboarding/Wizard');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'target_role' => ['nullable', 'string', 'max:100'],
            'industry' => ['nullable', 'string', 'max:100'],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:40'],
            'full_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
        ]);

        $user = $request->user();

        $user->update([
            'target_role' => $request->input('target_role'),
            'industry' => $request->input('industry'),
            'years_experience' => $request->input('years_experience'),
            'has_completed_onboarding' => true,
        ]);

        $contactFields = array_filter(
            $request->only(['full_name', 'email', 'phone', 'location', 'linkedin_url', 'website']),
            fn ($v) => $v !== null && $v !== '',
        );

        if ($contactFields) {
            $user->update(['profile' => array_merge($user->profile ?? [], $contactFields)]);
        }

        return redirect()->route('dashboard');
    }

    public function complete(Request $request): RedirectResponse
    {
        $request->user()->update(['has_completed_onboarding' => true]);

        return back();
    }
}
