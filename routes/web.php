<?php

use App\Http\Controllers\Auth\ConfirmedTwoFactorController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\TwoFactorRecoveryCodesController;
use App\Http\Controllers\AutocompleteController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

Route::get('/dashboard', fn () => redirect()->route('profile.edit'))
    ->middleware(['auth', 'verified', 'two_factor_challenge'])
    ->name('dashboard');

Route::middleware(['auth', 'verified', 'two_factor_challenge'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
    Route::patch('/user/profile-info', [ProfileController::class, 'updatePersona'])->name('profile.persona');

    Route::post('/user/two-factor-authentication', [TwoFactorController::class, 'store'])
        ->name('two-factor.enable');
    Route::post('/user/confirmed-two-factor-authentication', [ConfirmedTwoFactorController::class, 'store'])
        ->name('two-factor.confirm');
    Route::delete('/user/two-factor-authentication', [TwoFactorController::class, 'destroy'])
        ->middleware('password.confirm')
        ->name('two-factor.disable');
    Route::post('/user/two-factor-recovery-codes', [TwoFactorRecoveryCodesController::class, 'store'])
        ->name('two-factor.recovery-codes');

    // Autocomplete lookup
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/autocomplete/job-roles', [AutocompleteController::class, 'searchRoles'])->name('autocomplete.job-roles.search');
        Route::get('/autocomplete/job-titles', [AutocompleteController::class, 'searchTitles'])->name('autocomplete.job-titles.search');
        Route::get('/autocomplete/job-skills', [AutocompleteController::class, 'searchSkills'])->name('autocomplete.job-skills.search');
    });
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/autocomplete/job-roles', [AutocompleteController::class, 'storeRole'])->name('autocomplete.job-roles.store');
        Route::post('/autocomplete/job-titles', [AutocompleteController::class, 'storeTitle'])->name('autocomplete.job-titles.store');
        Route::post('/autocomplete/job-skills', [AutocompleteController::class, 'storeSkills'])->name('autocomplete.job-skills.store');
    });

});

require __DIR__.'/auth.php';
