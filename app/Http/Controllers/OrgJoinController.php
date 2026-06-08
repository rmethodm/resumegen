<?php

namespace App\Http\Controllers;

use App\Models\OrganizationMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrgJoinController extends Controller
{
    public function show(string $token): Response
    {
        $member = OrganizationMember::where('invite_token', $token)
            ->whereNull('joined_at')
            ->with('organization.owner')
            ->first();

        if (! $member) {
            abort(404, 'This invite link is invalid or has already been used.');
        }

        return Inertia::render('Org/Join', [
            'orgName' => $member->organization->name,
            'recruiterName' => $member->organization->owner->name,
            'token' => $token,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        if (! $request->user()) {
            return redirect()->route('login');
        }

        $orgName = DB::transaction(function () use ($request, $token) {
            $member = OrganizationMember::where('invite_token', $token)
                ->whereNull('joined_at')
                ->lockForUpdate()
                ->with('organization')
                ->first();

            if (! $member) {
                abort(404, 'This invite link is invalid or has already been used.');
            }

            $orgName = $member->organization->name;

            $member->update([
                'user_id' => $request->user()->id,
                'joined_at' => now(),
                'invite_token' => null,
            ]);

            return $orgName;
        });

        return redirect()->route('builder.index')
            ->with('success', "You've joined {$orgName}!");
    }
}
