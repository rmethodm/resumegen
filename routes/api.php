<?php

use App\Http\Controllers\Api\ExtensionController;
use App\Http\Controllers\Api\MobileAuthController;
use App\Http\Controllers\Api\ResumeController;
use App\Http\Controllers\Api\ShareLinkController;
use Illuminate\Support\Facades\Route;

/*
| Password login for the iPhone app. Tight throttle — credential guessing
| surface. 2FA accounts are refused here and use the Profile-page token flow.
*/
Route::post('/auth/token', [MobileAuthController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.auth.token');

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
    Route::get('/resumes/{resume}/pdf', [ResumeController::class, 'pdf'])->name('api.resumes.pdf');

    Route::delete('/auth/token', [MobileAuthController::class, 'destroy'])->name('api.auth.token.destroy');

    Route::get('/resumes/{resume}/share', [ShareLinkController::class, 'show'])->name('api.share.show');
    Route::post('/resumes/{resume}/share', [ShareLinkController::class, 'store'])->name('api.share.store');
    Route::put('/share-links/{resumeShareLink}', [ShareLinkController::class, 'update'])->name('api.share.update');
    Route::delete('/share-links/{resumeShareLink}', [ShareLinkController::class, 'destroy'])->name('api.share.destroy');
});
