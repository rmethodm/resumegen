<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('resumes:nudge-stale')->dailyAt('09:00');
Schedule::command('resumes:nudge-views')->weekly();
Schedule::command('ai:prune-flagged')->daily();
Schedule::command('ai:cost-alert')->dailyAt('08:00');
Schedule::command('system-events:prune')->daily();
Schedule::command('revenue:snapshot')->dailyAt('23:55');
