<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Only commands that still exist — stale entries error every schedule:run tick.
Schedule::command('ai:cost-alert')->dailyAt('08:00');
Schedule::command('jobs:run-alerts')->dailyAt('07:00');

// resume_deletions is a sync log, not history — it only exists so mobile
// `?since=` pulls learn about hard deletes. A client offline longer than the
// horizon must full-resync anyway.
Schedule::call(fn () => DB::table('resume_deletions')->where('deleted_at', '<', now()->subDays(90))->delete())
    ->name('prune-resume-deletions')
    ->dailyAt('06:00');
