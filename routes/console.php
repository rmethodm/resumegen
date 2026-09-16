<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// DB-backed schedule (scheduled_task_configs, editable at /admin/schedule)
// instead of hardcoded Schedule::command(...)->dailyAt(...) calls. Seeded by
// its migration with the exact prior backup:clean/run/monitor timing
// (01:00/01:30/01:45) so this rewrite doesn't change production behavior.
// Guarded by Schema::hasTable so `migrate` itself (which boots this file)
// doesn't fail before the table exists — but Schema::hasTable() itself
// throws (not just returns false) when the DB isn't reachable at all, which
// happens during `composer install`'s package:discover boot. Catch that too.
try {
    if (Schema::hasTable('scheduled_task_configs')) {
        foreach (DB::table('scheduled_task_configs')->where('enabled', true)->get() as $task) {
            Schedule::command($task->command)
                ->cron($task->cron_expression)
                ->withoutOverlapping();
        }
    }
} catch (\Throwable) {
    // DB unreachable at boot (e.g. composer install before services are up).
}

// resume_deletions is a sync log, not history — it only exists so mobile
// `?since=` pulls learn about hard deletes. A client offline longer than the
// horizon must full-resync anyway.
Schedule::call(fn () => DB::table('resume_deletions')->where('deleted_at', '<', now()->subDays(90))->delete())
    ->name('prune-resume-deletions')
    ->dailyAt('06:00');
