<?php

namespace App\Http\Controllers;

use App\Mail\OrgInviteMail;
use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OrgInviteController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('invite', $org);

        $request->validate(['email' => ['required', 'email', 'max:255']]);

        $usedSeats = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->count();

        if ($usedSeats >= $org->seat_limit) {
            return back()->with('error', 'Seat limit reached. Remove an existing member to free up a seat.');
        }

        $existing = OrganizationMember::where('organization_id', $org->id)
            ->where('invite_email', $request->email)
            ->first();

        if ($existing) {
            return back()->with('error', 'This email has already been invited.');
        }

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $request->email,
            'invite_token' => Str::random(64),
            'invited_at' => now(),
        ]);

        Mail::to($request->email)->send(new OrgInviteMail($org, $member));

        return back()->with('success', 'Invitation sent to '.$request->email.'.');
    }

    public function destroy(Request $request, OrganizationMember $member): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('removeMembers', $org);

        if ($member->organization_id !== $org->id) {
            abort(403);
        }

        if ($member->role === 'admin') {
            return back()->with('error', 'Cannot remove the org admin.');
        }

        if ($member->user_id) {
            Cache::forget("org_role_{$member->user_id}");
        }

        $member->delete();

        return back()->with('success', 'Member removed.');
    }
}
