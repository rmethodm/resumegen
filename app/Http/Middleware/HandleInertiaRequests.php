<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'orgRole' => $this->resolveOrgRole($request),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
            'featureGate' => session()->pull('featureGate'),
        ];
    }

    private function resolveOrgRole(Request $request): ?string
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return Cache::remember("org_role_{$user->id}", 60, function () use ($user) {
            if (Organization::where('owner_id', $user->id)->exists()) {
                return 'admin';
            }

            if (OrganizationMember::where('user_id', $user->id)->where('role', 'member')->whereNotNull('joined_at')->exists()) {
                return 'member';
            }

            return null;
        });
    }
}
