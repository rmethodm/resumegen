<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrganizationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Organizations/Index', [
            'organizations' => Organization::with('owner:id,name,email')
                ->withCount('members')
                ->latest()
                ->paginate(25),
        ]);
    }

    public function show(Organization $organization): Response
    {
        return Inertia::render('Admin/Organizations/Show', [
            'organization' => $organization->load([
                'owner:id,name,email',
                'members:id,organization_id,user_id,role,joined_at',
                'members.user:id,name,email',
            ]),
        ]);
    }

    public function destroy(Organization $organization): RedirectResponse
    {
        $name = $organization->name;
        $organization->delete();

        return redirect()->route('admin.organizations.index')
            ->with('success', "Organization \"{$name}\" deleted.");
    }
}
