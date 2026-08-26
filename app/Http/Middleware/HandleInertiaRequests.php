<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $adminDomain = config('app.admin_domain');
        $onAdminHost = is_string($adminDomain)
            && $adminDomain !== ''
            && $request->getHost() === $adminDomain;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
            'adminDestructiveTools' => $onAdminHost
                ? (bool) config('app.admin_destructive_tools')
                : null,
        ];
    }
}
