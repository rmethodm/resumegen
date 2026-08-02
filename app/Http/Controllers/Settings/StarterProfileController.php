<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateStarterProfileRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StarterProfileController extends Controller
{
    /**
     * Show the starter-profile intake/edit page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Settings/StarterProfile', [
            'starterProfile' => $request->user()->starterProfile,
        ]);
    }

    /**
     * Create or update the single starter profile for this user.
     */
    public function update(UpdateStarterProfileRequest $request): RedirectResponse
    {
        $request->user()->starterProfile()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->validated(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile saved.')]);

        return to_route('starter-profile.edit');
    }

    /**
     * Skip the intake: create the starter profile seeded with only the
     * account name and email, then hand off to the builder. Writing the row
     * clears the first-run redirect condition (resumes()->doesntExist() &&
     * starterProfile()->doesntExist()) so the user is never sent back here.
     * Name/email are carried so the seeded resume is not left nameless by the
     * "a blank profile name copies the blank" rule in createStarterResume().
     */
    public function skip(Request $request): RedirectResponse
    {
        $request->user()->starterProfile()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['full_name' => $request->user()->name, 'email' => $request->user()->email],
        );

        return to_route('resumes.index');
    }
}
