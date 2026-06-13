<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('resumes:nudge-stale')->dailyAt('09:00');
Schedule::command('strength-snapshots:prune')->weekly();
Schedule::command('ai:prune-flagged')->daily();
