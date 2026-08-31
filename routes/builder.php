<?php

use App\Http\Controllers\GuestResumeController;
use Illuminate\Support\Facades\Route;

/*
| Builder — domain-scoped via bootstrap/app.php (APP_BUILDER_DOMAIN).
| Guest entry point: template picker → guest account + resume, then hand
| off to the main host's /w/{token} login link.
*/

Route::get('/', [GuestResumeController::class, 'picker'])
    ->name('builder-domain.home');

Route::post('/start', [GuestResumeController::class, 'start'])
    ->middleware('throttle:10,1')
    ->name('builder-domain.start');
