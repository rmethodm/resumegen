<?php

namespace App\Http\Middleware;

use App\Services\AiCreditService;
use App\Services\AiUsageLimiter;
use Illuminate\Http\Request;
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
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
            'aiCredits' => function () use ($request) {
                if ($request->user() === null) {
                    return null;
                }

                $subscribed = app(AiUsageLimiter::class)->subscribedForAi($request->user());

                return [
                    'balance' => app(AiCreditService::class)->balance($request->user()),
                    'subscribed' => $subscribed,
                    'canPurchase' => $subscribed && ! $request->user()->ai_blocked,
                ];
            },
        ];
    }
}
