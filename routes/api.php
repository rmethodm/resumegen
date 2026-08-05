<?php

use App\Http\Controllers\Api\ExtensionController;
use Illuminate\Support\Facades\Route;

/*
| Sanctum personal-access-token API (no session fallback — config/sanctum.php
| sets guard to []). Used by the Resumegen Apply browser extension.
*/
Route::middleware(['auth:sanctum', 'throttle:60,1'])->prefix('extension')->group(function () {
    Route::get('/me', [ExtensionController::class, 'me'])->name('api.extension.me');
    Route::get('/resumes', [ExtensionController::class, 'resumes'])->name('api.extension.resumes');
    Route::get('/resumes/{resume}/fill-profile', [ExtensionController::class, 'fillProfile'])
        ->name('api.extension.fill-profile');
});
