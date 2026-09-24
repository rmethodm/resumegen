<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Backups are code defaults that ALWAYS schedule. scheduled_task_configs rows
// (editable at /admin/schedule) may only override the cron expression or the
// enabled flag of a command listed here — an empty or unreadable table must
// never silently drop backups. Unknown commands in the table are ignored.
$scheduledTasks = [
    'backup:clean' => ['cron_expression' => '0 1 * * *', 'enabled' => true],
    'backup:run' => ['cron_expression' => '30 1 * * *', 'enabled' => true],
    'backup:monitor' => ['cron_expression' => '45 1 * * *', 'enabled' => true],
];

// Schema::hasTable() throws (not just returns false) when the DB is
// unreachable — e.g. `composer install`'s package:discover boot or a fresh
// clone without a DB — so a failure here falls back to the defaults.
try {
    if (Schema::hasTable('scheduled_task_configs')) {
        $overrides = DB::table('scheduled_task_configs')
            ->whereIn('command', array_keys($scheduledTasks))
            ->get();

        foreach ($overrides as $override) {
            $scheduledTasks[$override->command] = [
                'cron_expression' => $override->cron_expression,
                'enabled' => (bool) $override->enabled,
            ];
        }
    }
} catch (Throwable $e) {
    Log::warning('Schedule overrides unavailable; using code defaults.', ['exception' => $e->getMessage()]);
}

foreach ($scheduledTasks as $command => $task) {
    if ($task['enabled']) {
        Schedule::command($command)
            ->cron($task['cron_expression'])
            ->withoutOverlapping();
    }
}

// resume_deletions is a sync log, not history — it only exists so mobile
// `?since=` pulls learn about hard deletes. A client offline longer than the
// horizon must full-resync anyway.
Schedule::call(fn () => DB::table('resume_deletions')->where('deleted_at', '<', now()->subDays(90))->delete())
    ->name('prune-resume-deletions')
    ->dailyAt('06:00');
