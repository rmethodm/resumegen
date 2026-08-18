<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Only commands that still exist — stale entries error every schedule:run tick.
Schedule::command('ai:cost-alert')->dailyAt('08:00');
Schedule::command('jobs:run-alerts')->dailyAt('07:00');
