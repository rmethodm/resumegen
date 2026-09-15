<?php

use App\Http\Controllers\Admin\ScheduleController;
use Illuminate\Support\Facades\Route;

/*
| Narrow admin surface — schedule management only. See CLAUDE.md "Admin
| Panel — removed" for why this stayed gone until now, and the Phase E
| section of docs/superpowers/specs/2026-09-14-jobnavigator-tier1-import-design.md
| for the scope of this reintroduction.
*/
Route::get('/schedule', [ScheduleController::class, 'index'])->name('schedule.index');
Route::patch('/schedule/{scheduledTaskConfig}', [ScheduleController::class, 'update'])->name('schedule.update');
