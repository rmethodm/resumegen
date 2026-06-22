<?php

use App\Console\Commands\NudgeStaleResumesCommand;
use App\Http\Middleware\EnsureMasterAdmin;
use App\Http\Middleware\EnsureOrgAdmin;
use App\Http\Middleware\EnsureTwoFactorSetup;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequiresTwoFactorChallenge;
use App\Http\Middleware\TrackActivity;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            TrackActivity::class,
        ]);

        $middleware->alias([
            'master_admin' => EnsureMasterAdmin::class,
            'org.admin' => EnsureOrgAdmin::class,
            'two_factor_challenge' => RequiresTwoFactorChallenge::class,
            'two_factor_setup' => EnsureTwoFactorSetup::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'stripe/webhook',
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command(NudgeStaleResumesCommand::class)->daily();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
