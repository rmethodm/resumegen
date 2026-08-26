<?php

use App\Http\Middleware\EnforceAdminSessionIdleTimeout;
use App\Http\Middleware\EnsureAdminDestructiveToolsAllowed;
use App\Http\Middleware\EnsureAdminHasTwoFactor;
use App\Http\Middleware\EnsureUserCanWrite;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserNotDisabled;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequiresTwoFactorChallenge;
use App\Http\Middleware\SecurityHeaders;
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
            SecurityHeaders::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            TrackActivity::class,
            TrackSiteVisit::class,
            EnsureUserNotDisabled::class,
            EnsureUserCanWrite::class,
        ]);

        $middleware->api(append: [
            EnsureUserCanWrite::class,
        ]);

        $middleware->alias([
            'two_factor_challenge' => RequiresTwoFactorChallenge::class,
            'admin' => EnsureUserIsAdmin::class,
            'admin.two_factor' => EnsureAdminHasTwoFactor::class,
            'admin.session_idle' => EnforceAdminSessionIdleTimeout::class,
            'admin.destructive' => EnsureAdminDestructiveToolsAllowed::class,
            'user.not_disabled' => EnsureUserNotDisabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
