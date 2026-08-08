<?php

use App\Http\Controllers\Api\ExtensionController;
use App\Http\Controllers\Api\ResumeController;
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

/*
| Full resume CRUD for the iPhone app, gated on the 'mobile' token ability
| (see App\Support\MobileApiToken).
*/
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('/resumes', [ResumeController::class, 'index'])->name('api.resumes.index');
    Route::post('/resumes', [ResumeController::class, 'store'])->name('api.resumes.store');
    Route::get('/resumes/{resume}', [ResumeController::class, 'show'])->name('api.resumes.show');
    Route::put('/resumes/{resume}', [ResumeController::class, 'update'])->name('api.resumes.update');
    Route::delete('/resumes/{resume}', [ResumeController::class, 'destroy'])->name('api.resumes.destroy');
});
