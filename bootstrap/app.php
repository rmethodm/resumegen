<?php

use App\Http\Middleware\EnsureAiEnabled;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserNotDisabled;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequiresTwoFactorChallenge;
use App\Http\Middleware\TrackActivity;
use App\Http\Middleware\TrackSiteVisit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            $adminDomain = config('app.admin_domain');

            if (! is_string($adminDomain) || $adminDomain === '') {
                return;
            }

            Route::middleware('web')
                ->domain($adminDomain)
                ->group(base_path('routes/admin.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Relative /login keeps guests on the current host (admin.resumegen.test
        // vs resumegen.test). Named route('login') is absolute to APP_URL and
        // was bouncing admin visitors onto the product login/dashboard.
        $middleware->redirectGuestsTo(fn () => url('/login'));

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            TrackActivity::class,
            TrackSiteVisit::class,
            EnsureUserNotDisabled::class,
        ]);

        $middleware->alias([
            'two_factor_challenge' => RequiresTwoFactorChallenge::class,
            'admin' => EnsureUserIsAdmin::class,
            'user.not_disabled' => EnsureUserNotDisabled::class,
            'ai_enabled' => EnsureAiEnabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
