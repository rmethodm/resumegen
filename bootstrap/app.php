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

        // No trustProxies() on purpose: the app is served directly by Apache,
        // so $request->ip() is the real REMOTE_ADDR and X-Forwarded-For
        // spoofing cannot fool IP-keyed throttles or registration velocity.
        // If a CDN/reverse proxy is ever put in front, configure
        // $middleware->trustProxies() or every IP-keyed limit silently
        // collapses to the proxy's IP.
        $middleware->web(append: [
            SecurityHeaders::class,
            // Global, not per-route: a pending-2FA session is fully
            // authenticated, so any route that forgot the alias would be a
            // 2FA bypass. The middleware allowlists the challenge routes.
            RequiresTwoFactorChallenge::class,
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
