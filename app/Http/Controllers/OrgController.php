<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Services\UserLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class OrgController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        if (! UserLimits::canUseOrg($request->user())) {
            return redirect()->route('dashboard')->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
        }

        $org = Organization::where('owner_id', $request->user()->id)->first();

        if (! $org) {
            return redirect()->route('org.create');
        }

        $members = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNotNull('joined_at')
            ->with(['user', 'user.resumes' => fn ($q) => $q->nonSnapshot()->orderByDesc('updated_at')->select(['id', 'user_id', 'name'])])
            ->get()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'name' => $m->user?->name,
                'email' => $m->invite_email ?? $m->user?->email,
                'joined_at' => $m->joined_at?->toDateString(),
                'resume_count' => $m->user?->resumes->count() ?? 0,
                'resumes' => $m->user?->resumes
                    ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
                    ->all() ?? [],
            ]);

        $pendingInvites = OrganizationMember::where('organization_id', $org->id)
            ->where('role', 'member')
            ->whereNull('joined_at')
            ->get()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'invite_email' => $m->invite_email,
                'invited_at' => $m->invited_at?->toDateString(),
            ]);

        return Inertia::render('Org/Show', [
            'org' => [
                'id' => $org->id,
                'name' => $org->name,
                'seat_limit' => $org->seat_limit,
            ],
            'members' => $members,
            'pendingInvites' => $pendingInvites,
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        if (! UserLimits::canCreateOrg($request->user())) {
            return back()->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
        }

        if (Organization::where('owner_id', $request->user()->id)->exists()) {
            return redirect()->route('org.show');
        }

        return Inertia::render('Org/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        if (! UserLimits::canCreateOrg($request->user())) {
            return back()->with('featureGate', ['feature' => 'team_workspace', 'requiredTier' => 'agency']);
        }

        if (Organization::where('owner_id', $request->user()->id)->exists()) {
            return redirect()->route('org.show');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $org = Organization::create([
            'name' => $validated['name'],
            'owner_id' => $request->user()->id,
        ]);

        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $request->user()->id,
            'role' => 'admin',
            'invite_email' => $request->user()->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        Cache::forget("org_role_{$request->user()->id}");

        return redirect()->route('org.show');
    }

    public function update(Request $request): RedirectResponse
    {
        $org = Organization::where('owner_id', $request->user()->id)->firstOrFail();
        $this->authorize('update', $org);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $org->update($validated);

        return back()->with('success', 'Organization updated.');
    }
}
