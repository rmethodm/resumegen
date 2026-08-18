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
        $data = $request->validated();

        // Every scalar column is NOT NULL DEFAULT '' (see the starter_profiles
        // migration) — "blank" is stored as '', never null. The validation
        // rules mark these fields nullable ("a blank profile is legitimate"),
        // and ConvertEmptyStringsToNull turns a blank input into null before
        // validation, so without this the DB rejects the write outright and
        // the whole profile silently fails to save.
        foreach ([
            'full_name', 'headline', 'email', 'phone',
            'location', 'target_role', 'linkedin', 'website',
        ] as $field) {
            $data[$field] ??= '';
        }

        $request->user()->starterProfile()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $data,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile saved.')]);

        return to_route('starter-profile.edit');
    }

    /**
     * Skip the intake: create the starter profile seeded with only the
     * account name and email, then hand off to the resume-types catalogue.
     * Name/email are carried so later resume creates still seed contact fields.
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
