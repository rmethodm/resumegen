<?php

use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    $providerConstraint = implode('|', SocialiteController::PROVIDERS);

    Route::get('auth/{provider}/redirect', [SocialiteController::class, 'redirect'])
        ->middleware('throttle:10,1')
        ->where('provider', $providerConstraint)
        ->name('oauth.redirect');
    Route::get('auth/{provider}/callback', [SocialiteController::class, 'callback'])
        ->middleware('throttle:10,1')
        ->where('provider', $providerConstraint)
        ->name('oauth.callback');
});

Route::middleware('auth')->group(function () {
    // Named 'password.change' (not Breeze's 'password.update') because Fortify's own
    // password-reset flow registers a route also named 'password.update' (POST
    // /reset-password); with both present, the last-registered route wins the name
    // lookup, which silently pointed route('password.update') at /reset-password
    // instead of this route.
    Route::put('password', [PasswordController::class, 'update'])
        ->middleware('two_factor_challenge')
        ->name('password.change');

    Route::get('two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
        ->name('two-factor.challenge');
    Route::post('two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('two-factor.challenge.store');
});
