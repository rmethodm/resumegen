<?php

use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // Named 'password.change' (not Breeze's 'password.update') because Fortify's own
    // password-reset flow registers a route also named 'password.update' (POST
    // /reset-password); with both present, the last-registered route wins the name
    // lookup, which silently pointed route('password.update') at /reset-password
    // instead of this route.
    Route::put('password', [PasswordController::class, 'update'])->name('password.change');

    Route::get('two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
        ->name('two-factor.challenge');
    Route::post('two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('two-factor.challenge.store');
    Route::post('two-factor-challenge/email', [TwoFactorChallengeController::class, 'sendEmail'])
        ->middleware('throttle:3,1')
        ->name('two-factor.challenge.email');
});
