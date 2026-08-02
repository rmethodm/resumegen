<?php

namespace App\Http\Controllers;

use App\Services\UserLimits;
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

        return Inertia::render('Onboarding/Wizard', [
            'allowedTemplates' => UserLimits::allTemplates(),
            'allTemplates' => UserLimits::allTemplates(),
        ]);
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
            'preferred_template' => ['nullable', 'string', 'in:classic,modern,minimal,minimal-ruled,executive,ats,skills-first,academic,bold'],
        ]);

        $user = $request->user();

        $personaFields = array_filter(
            $request->only(['target_role', 'industry', 'years_experience']),
            fn ($v) => $v !== null && $v !== '',
        );

        if ($request->filled('preferred_template')) {
            $personaFields['preferred_template'] = $request->input('preferred_template');
        }

        $user->update(array_merge($personaFields, ['has_completed_onboarding' => true]));

        $contactFields = array_filter(
            $request->only(['full_name', 'phone', 'location', 'linkedin_url', 'website']),
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
