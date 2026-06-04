<?php

use App\Http\Controllers\Admin\AdminUsageController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AiSuggestController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AtsScoreController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CoverLetterController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PersonalTokenController;
use App\Http\Controllers\UsageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicResumeController;
use App\Http\Controllers\ResumeBuilderController;
use App\Http\Controllers\ShareLinkController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

Route::get('/dashboard', [AnalyticsController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/tokens', [PersonalTokenController::class, 'store'])->name('profile.tokens.store');
    Route::delete('/profile/tokens/{tokenId}', [PersonalTokenController::class, 'destroy'])->name('profile.tokens.destroy');

    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');

    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::post('/builder', [ResumeBuilderController::class, 'store'])->name('builder.store');
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
    Route::put('/builder/{resume}', [ResumeBuilderController::class, 'update'])->name('builder.update');
    Route::delete('/builder/{resume}', [ResumeBuilderController::class, 'destroy'])->name('builder.destroy');
    Route::get('/builder/{resume}/pdf', [ResumeBuilderController::class, 'downloadPdf'])->name('builder.pdf');
    Route::get('/builder/{resume}/preview', [ResumeBuilderController::class, 'previewPdf'])->name('builder.preview');
    Route::post('/builder/{resume}/beacon', [ResumeBuilderController::class, 'beacon'])->name('builder.beacon');
    Route::post('/builder/{resume}/duplicate', [ResumeBuilderController::class, 'duplicate'])->name('builder.duplicate');
    Route::post('/builder/{resume}/ai-suggest', [AiSuggestController::class, 'suggest'])
        ->middleware('throttle:10,1')
        ->name('builder.ai-suggest');
    Route::get('/builder/{resume}/ats-score', [AtsScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.ats-score');
    Route::delete('/builder/{resume}/ats-score', [AtsScoreController::class, 'destroy'])
        ->name('builder.ats-score.destroy');

    Route::post('/builder/{resume}/share', [ShareLinkController::class, 'store'])->name('share.store');
    Route::patch('/builder/{resume}/share/{link}', [ShareLinkController::class, 'update'])->name('share.update');
    Route::delete('/builder/{resume}/share/{link}', [ShareLinkController::class, 'destroy'])->name('share.destroy');
    Route::patch('/builder/{resume}/questions/{question}/read', [ShareLinkController::class, 'markRead'])->name('questions.read');
    Route::patch('/builder/{resume}/questions/read-all', [ShareLinkController::class, 'markAllRead'])->name('questions.read-all');

    Route::get('/cover-letters', [CoverLetterController::class, 'index'])->name('cover-letters.index');
    Route::post('/cover-letters', [CoverLetterController::class, 'store'])->name('cover-letters.store');
    Route::get('/cover-letters/{letter}', [CoverLetterController::class, 'edit'])->name('cover-letters.edit');
    Route::put('/cover-letters/{letter}', [CoverLetterController::class, 'update'])->name('cover-letters.update');
    Route::delete('/cover-letters/{letter}', [CoverLetterController::class, 'destroy'])->name('cover-letters.destroy');

    Route::get('/jobs', [JobApplicationController::class, 'index'])->name('jobs.index');
    Route::post('/jobs', [JobApplicationController::class, 'store'])->name('jobs.store');
    Route::get('/jobs/{application}', [JobApplicationController::class, 'edit'])->name('jobs.edit');
    Route::put('/jobs/{application}', [JobApplicationController::class, 'update'])->name('jobs.update');
    Route::delete('/jobs/{application}', [JobApplicationController::class, 'destroy'])->name('jobs.destroy');

    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');

    Route::get('/usage', [UsageController::class, 'index'])->name('usage.index');
});

// Public (unauthenticated) share link routes
Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
Route::get('/r/{token}/pdf', [PublicResumeController::class, 'downloadPdf'])->name('public.pdf');
Route::post('/r/{token}/questions', [PublicResumeController::class, 'storeQuestion'])->middleware('throttle:5,1')->name('public.question');

Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/usage', [AdminUsageController::class, 'index'])->name('usage');
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/toggle-pro', [AdminUserController::class, 'togglePro'])->name('users.toggle-pro');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
});

require __DIR__.'/auth.php';
