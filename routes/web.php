<?php

use App\Http\Controllers\Auth\ConfirmedTwoFactorController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\TwoFactorRecoveryCodesController;
use App\Http\Controllers\AutocompleteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExtensionTokenController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobImportsController;
use App\Http\Controllers\MobileTokenController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicResumeShareController;
use App\Http\Controllers\ResumeAiController;
use App\Http\Controllers\ResumeCompareController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\ResumeGroupController;
use App\Http\Controllers\ResumeNoteController;
use App\Http\Controllers\ResumeShareLinkController;
use App\Http\Controllers\ResumeSnapshotController;
use App\Http\Controllers\Settings\StarterProfileController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class);

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified', 'two_factor_challenge'])
    ->name('dashboard');

// Public, token-authenticated — the recipient of a shared link has no
// account. The token in the URL is the credential.
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/r/{token}', [PublicResumeShareController::class, 'show'])->name('share.show');
    Route::get('/r/{token}/pdf', [PublicResumeShareController::class, 'pdf'])->name('share.pdf');
    Route::get('/r/{token}/docx', [PublicResumeShareController::class, 'docx'])->name('share.docx');
});
Route::post('/r/{token}/unlock', [PublicResumeShareController::class, 'unlock'])
    ->middleware('throttle:share-unlock')
    ->name('share.unlock');

Route::middleware(['auth', 'verified', 'two_factor_challenge'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/extension-tokens', [ExtensionTokenController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('profile.extension-tokens.store');
    Route::delete('/profile/extension-tokens/{token}', [ExtensionTokenController::class, 'destroy'])
        ->middleware('throttle:10,1')
        ->name('profile.extension-tokens.destroy');

    Route::post('/profile/mobile-tokens', [MobileTokenController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('profile.mobile-tokens.store');
    Route::delete('/profile/mobile-tokens/{token}', [MobileTokenController::class, 'destroy'])
        ->middleware('throttle:10,1')
        ->name('profile.mobile-tokens.destroy');

    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
    Route::patch('/user/profile-info', [ProfileController::class, 'updatePersona'])->name('profile.persona');

    Route::get('/settings/starter-profile', [StarterProfileController::class, 'edit'])->name('starter-profile.edit');
    Route::patch('/settings/starter-profile', [StarterProfileController::class, 'update'])->name('starter-profile.update');
    Route::post('/settings/starter-profile/skip', [StarterProfileController::class, 'skip'])->name('starter-profile.skip');

    // Job Imports: real search (Adzuna/USAJOBS) + persistence. Matching, gap
    // analysis, tailoring, and cover letters stay frontend stubs — see
    // JobImportsController's docblock before adding any of them for real.
    Route::get('/jobs-imports', [JobImportsController::class, 'index'])->name('jobs-imports.index');
    Route::post('/jobs-imports/search', [JobImportsController::class, 'search'])
        ->middleware('throttle:20,1')
        ->name('jobs-imports.search');
    Route::post('/jobs-imports', [JobImportsController::class, 'store'])->name('jobs-imports.store');
    Route::patch('/jobs-imports/{importedJob}', [JobImportsController::class, 'updateStatus'])->name('jobs-imports.update-status');

    // Job Application Kanban: tracks applications through Saved/Applied/
    // Interviewing/Offer/Rejected. Contacts and interview notes stay
    // out of scope — see JobApplicationController's docblock.
    Route::get('/job-applications', [JobApplicationController::class, 'index'])->name('job-applications.index');
    Route::post('/job-applications', [JobApplicationController::class, 'store'])->name('job-applications.store');
    Route::patch('/job-applications/{jobApplication}', [JobApplicationController::class, 'update'])->name('job-applications.update');
    Route::delete('/job-applications/{jobApplication}', [JobApplicationController::class, 'destroy'])->name('job-applications.destroy');

    Route::get('/resumes', [ResumeController::class, 'index'])->name('resumes.index');
    Route::post('/resumes', [ResumeController::class, 'store'])->name('resumes.store');
    Route::get('/resumes/{resume}/workstation', [ResumeController::class, 'workstation'])->name('resumes.workstation');
    Route::put('/resumes/{resume}', [ResumeController::class, 'update'])->name('resumes.update');
    Route::get('/resumes/{resume}/export', [ResumeController::class, 'download'])->name('resumes.download');
    Route::get('/resumes/{resume}/export-docx', [ResumeController::class, 'downloadDocx'])->name('resumes.download-docx');
    Route::get('/resumes/{resume}/preview', [ResumeController::class, 'preview'])->name('resumes.preview');
    Route::post('/resumes/{resume}/duplicate', [ResumeController::class, 'duplicate'])->name('resumes.duplicate');
    Route::patch('/resumes/{resume}/rename', [ResumeController::class, 'rename'])->name('resumes.rename');
    Route::delete('/resumes/{resume}', [ResumeController::class, 'destroy'])->name('resumes.destroy');

    // Optional AI (gated by config/ai.php — disabled by default).
    Route::get('/ai/status', [ResumeAiController::class, 'status'])->name('ai.status');
    Route::middleware('throttle:20,1')->group(function () {
        Route::post('/resumes/{resume}/ai/rewrite-bullet', [ResumeAiController::class, 'rewriteBullet'])
            ->name('resumes.ai.rewrite-bullet');
        Route::post('/resumes/{resume}/ai/summary', [ResumeAiController::class, 'generateSummary'])
            ->name('resumes.ai.summary');
    });

    Route::post('/resumes/{resume}/share', [ResumeShareLinkController::class, 'store'])->name('resumes.share.store');
    Route::patch('/resume-share-links/{resumeShareLink}', [ResumeShareLinkController::class, 'update'])->name('resume-share-links.update');
    Route::delete('/resume-share-links/{resumeShareLink}', [ResumeShareLinkController::class, 'destroy'])->name('resume-share-links.destroy');

    Route::post('/resumes/{resume}/notes', [ResumeNoteController::class, 'store'])->name('resume-notes.store');
    Route::patch('/resume-notes/{resumeNote}', [ResumeNoteController::class, 'update'])->name('resume-notes.update');
    Route::delete('/resume-notes/{resumeNote}', [ResumeNoteController::class, 'destroy'])->name('resume-notes.destroy');

    Route::post('/resumes/{resume}/snapshots', [ResumeSnapshotController::class, 'store'])->name('resume-snapshots.store');
    Route::post('/resumes/{resume}/snapshots/{snapshot}/restore', [ResumeSnapshotController::class, 'restore'])->name('resume-snapshots.restore');
    Route::delete('/resumes/{resume}/snapshots/{snapshot}', [ResumeSnapshotController::class, 'destroy'])->name('resume-snapshots.destroy');

    Route::patch('/resume-groups/{resumeGroup}', [ResumeGroupController::class, 'update'])->name('resume-groups.update');
    Route::delete('/resume-groups/{resumeGroup}', [ResumeGroupController::class, 'destroy'])->name('resume-groups.destroy');
    Route::get('/resume-groups/{resumeGroup}/compare', [ResumeCompareController::class, 'show'])->name('resume-groups.compare');

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
