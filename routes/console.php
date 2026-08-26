<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Spatie laravel-backup — clean first, then take a fresh backup, then health-check.
// Avoid 02:00–03:00 where DST can skip or double a run.
Schedule::command('backup:clean')
    ->dailyAt('01:00')
    ->withoutOverlapping();
Schedule::command('backup:run')
    ->dailyAt('01:30')
    ->withoutOverlapping();
Schedule::command('backup:monitor')
    ->dailyAt('01:45')
    ->withoutOverlapping();

// resume_deletions is a sync log, not history — it only exists so mobile
// `?since=` pulls learn about hard deletes. A client offline longer than the
// horizon must full-resync anyway.
Schedule::call(fn () => DB::table('resume_deletions')->where('deleted_at', '<', now()->subDays(90))->delete())
    ->name('prune-resume-deletions')
    ->dailyAt('06:00');
