<?php

use App\Http\Controllers\ApplyWizardController;
use App\Http\Controllers\Auth\ConfirmedTwoFactorController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\TwoFactorRecoveryCodesController;
use App\Http\Controllers\AutocompleteController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DevResetController;
use App\Http\Controllers\ExtensionConnectController;
use App\Http\Controllers\ExtensionTokenController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobApplicationInterviewController;
use App\Http\Controllers\JobApplicationStatsController;
use App\Http\Controllers\JobListingController;
use App\Http\Controllers\JobPoolController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\MobileTokenController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectIssueController;
use App\Http\Controllers\PublicResumeShareController;
use App\Http\Controllers\ResumeBuilderController;
use App\Http\Controllers\ResumeCompareController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\ResumeGroupController;
use App\Http\Controllers\ResumeNoteController;
use App\Http\Controllers\ResumeShareLinkController;
use App\Http\Controllers\ResumeSnapshotController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\Settings\QaBankEntryController;
use App\Http\Controllers\Settings\StarterProfileController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Controllers\UrlCheckController;
use App\Http\Controllers\UserPreferenceController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class);

// Destructive: wipes every row except the test account's login. Never
// registered outside local development.
if (app()->isLocal()) {
    Route::get('/reset', DevResetController::class)->name('dev.reset');
}

if (app()->isLocal()) {
    Route::view('/shadcn', 'shadcn-demo')->name('shadcn.demo');
}

Route::get('/privacy', [LegalController::class, 'privacy'])->name('legal.privacy');
Route::get('/terms', [LegalController::class, 'terms'])->name('legal.terms');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
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

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/extension-tokens', [ExtensionTokenController::class, 'store'])
        ->middleware(['throttle:10,1', 'password.confirm'])
        ->name('profile.extension-tokens.store');
    Route::delete('/profile/extension-tokens/{token}', [ExtensionTokenController::class, 'destroy'])
        ->middleware('throttle:10,1')
        ->name('profile.extension-tokens.destroy');

    Route::get('/extension/connect', [ExtensionConnectController::class, 'show'])
        ->middleware('password.confirm')
        ->name('extension.connect');
    Route::post('/extension/connect/token', [ExtensionConnectController::class, 'issueToken'])
        ->middleware(['throttle:10,1', 'password.confirm'])
        ->name('extension.connect.token');

    Route::post('/profile/mobile-tokens', [MobileTokenController::class, 'store'])
        ->middleware(['throttle:10,1', 'password.confirm'])
        ->name('profile.mobile-tokens.store');
    Route::delete('/profile/mobile-tokens/{token}', [MobileTokenController::class, 'destroy'])
        ->middleware('throttle:10,1')
        ->name('profile.mobile-tokens.destroy');

    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
    Route::patch('/user/profile-info', [ProfileController::class, 'updatePersona'])->name('profile.persona');

    Route::patch('/user/checklist/dismiss', [UserPreferenceController::class, 'dismissChecklist'])->name('checklist.dismiss');
    Route::patch('/user/apply-wizard-preference', [UserPreferenceController::class, 'setApplyWizardPreference'])->name('apply-wizard.preference');

    Route::get('/settings/starter-profile', [StarterProfileController::class, 'edit'])->name('starter-profile.edit');
    Route::patch('/settings/starter-profile', [StarterProfileController::class, 'update'])->name('starter-profile.update');
    Route::post('/settings/starter-profile/skip', [StarterProfileController::class, 'skip'])->name('starter-profile.skip');

    Route::post('/settings/starter-profile/qa-bank', [QaBankEntryController::class, 'store'])->name('qa-bank-entries.store');
    Route::patch('/settings/starter-profile/qa-bank/{entry}', [QaBankEntryController::class, 'update'])->name('qa-bank-entries.update');
    Route::delete('/settings/starter-profile/qa-bank/{entry}', [QaBankEntryController::class, 'destroy'])->name('qa-bank-entries.destroy');
    Route::post('/settings/starter-profile/qa-bank/{entry}/draft', [QaBankEntryController::class, 'draft'])
        ->middleware('throttle:20,1')
        ->name('qa-bank-entries.draft');

    // Job Application Kanban: tracks applications through Saved/Applied/
    // Interviewing/Offer/Rejected, plus a per-round interview log. Contact
    // management stays out of scope — see JobApplicationController's docblock.
    Route::get('/job-applications', [JobApplicationController::class, 'index'])->name('job-applications.index');
    Route::post('/job-applications', [JobApplicationController::class, 'store'])->name('job-applications.store');
    Route::patch('/job-applications/{jobApplication}', [JobApplicationController::class, 'update'])->name('job-applications.update');
    Route::delete('/job-applications/{jobApplication}', [JobApplicationController::class, 'destroy'])->name('job-applications.destroy');

    Route::post('/job-applications/{jobApplication}/interviews', [JobApplicationInterviewController::class, 'store'])->name('job-application-interviews.store');
    Route::patch('/job-applications/{jobApplication}/interviews/{interview}', [JobApplicationInterviewController::class, 'update'])->name('job-application-interviews.update');
    Route::delete('/job-applications/{jobApplication}/interviews/{interview}', [JobApplicationInterviewController::class, 'destroy'])->name('job-application-interviews.destroy');

    Route::get('/job-applications/stats', [JobApplicationStatsController::class, 'index'])->name('job-applications.stats');

    Route::get('/jobs/browse', [JobListingController::class, 'index'])->name('jobs.browse');
    Route::get('/jobs/pool', [JobPoolController::class, 'index'])->name('jobs.pool');
    Route::post('/jobs/pool', [JobPoolController::class, 'store'])->name('job-pool.store');
    Route::delete('/jobs/pool/{jobPoolEntry}', [JobPoolController::class, 'destroy'])->name('job-pool.destroy');

    Route::get('/apply/new', [ApplyWizardController::class, 'show'])->name('apply.wizard');

    Route::get('/resumes', [ResumeController::class, 'index'])->name('resumes.index');
    Route::post('/resumes', [ResumeController::class, 'store'])->name('resumes.store');
    Route::get('/resumes/{resume}/workstation', [ResumeController::class, 'workstation'])->name('resumes.workstation');
    Route::get('/resumes/{resume}/builder', [ResumeController::class, 'builder'])->name('resumes.builder');
    Route::put('/resumes/{resume}', [ResumeController::class, 'update'])->name('resumes.update');
    Route::get('/resumes/{resume}/export', [ResumeController::class, 'download'])->name('resumes.download');
    Route::get('/resumes/{resume}/export-docx', [ResumeController::class, 'downloadDocx'])->name('resumes.download-docx');
    Route::post('/resumes/{resume}/ai-review', [ResumeController::class, 'aiReview'])
        ->middleware('throttle:20,1')
        ->name('resumes.ai-review');
    Route::get('/resumes/{resume}/preview', [ResumeController::class, 'preview'])->name('resumes.preview');
    Route::post('/resumes/{resume}/duplicate', [ResumeController::class, 'duplicate'])->name('resumes.duplicate');
    Route::patch('/resumes/{resume}/rename', [ResumeController::class, 'rename'])->name('resumes.rename');
    Route::delete('/resumes/{resume}', [ResumeController::class, 'destroy'])->name('resumes.destroy');

    // Soft URL reachability check for resume LinkedIn / website / project fields.
    Route::post('/urls/check', UrlCheckController::class)
        ->middleware('throttle:30,1')
        ->name('urls.check');

    Route::get('/resumes/{resume}/share', [ResumeShareLinkController::class, 'show'])->name('resumes.share.show');
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
        ->middleware('password.confirm')
        ->name('two-factor.enable');
    Route::post('/user/confirmed-two-factor-authentication', [ConfirmedTwoFactorController::class, 'store'])
        ->name('two-factor.confirm');
    Route::delete('/user/two-factor-authentication', [TwoFactorController::class, 'destroy'])
        ->middleware('password.confirm')
        ->name('two-factor.disable');
    Route::post('/user/two-factor-recovery-codes', [TwoFactorRecoveryCodesController::class, 'store'])
        ->middleware('password.confirm')
        ->name('two-factor.recovery-codes');

    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::get('/builder/create', [ResumeBuilderController::class, 'create'])->name('builder.create');
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
    Route::get('/builder/{resume}/pdf', [ResumeBuilderController::class, 'downloadPdf'])->name('builder.pdf');
    Route::get('/builder/{resume}/preview', [ResumeBuilderController::class, 'previewPdf'])->name('builder.preview');
    Route::get('/builder/{resume}/html-preview', [ResumeBuilderController::class, 'htmlPreview'])->name('builder.html-preview');
    Route::get('/builder/{resume}/share-url', [ResumeBuilderController::class, 'shareUrl'])->name('builder.share-url');

    Route::get('/search', SearchController::class)->name('search')->middleware('throttle:30,1');

    Route::post('/builder/{resume}/share', [ShareLinkController::class, 'store'])->name('share.store');
    Route::patch('/builder/{resume}/share/{link}', [ShareLinkController::class, 'update'])->name('share.update');
    Route::delete('/builder/{resume}/share/{link}', [ShareLinkController::class, 'destroy'])->name('share.destroy');
    Route::get('/shares', [ShareController::class, 'index'])->name('shares.index');

    // Project Management demo pages — local only, never registered in production.
    if (app()->isLocal()) {
        Route::get('/projects/issues', [ProjectIssueController::class, 'index'])->name('projects.issues.index');
        Route::get('/projects/issues/kanban', [ProjectIssueController::class, 'kanban'])->name('projects.issues.kanban');
    }

    Route::get('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::get('/billing/credits', [BillingController::class, 'credits'])->name('billing.credits');

    // Generative Workstation AI HTTP is intentionally unregistered for v1:
    // ai.rewrite-bullet, ai.rewrite-summary, ai.generate-gap,
    // ai.rewrite-section (Rewrite/Generate UI removed; section stays deferred).
    // resumes.ai-review is now registered above (Optimize tab AI critique).

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

// Fake job-application pages for testing the Resumegen Apply extension
// against common ATS field-naming conventions. Local only — never
// registered outside development.
if (app()->environment('local')) {
    Route::get('/dev/job-fixtures', fn () => view('dev.job-fixtures.index'))->name('dev.job-fixtures.index');
    Route::get('/dev/job-fixtures/{page}', function (string $page) {
        abort_unless(in_array($page, [
            'workday', 'greenhouse', 'lever', 'icims', 'custom',
            'taleo', 'ashby', 'smartrecruiters',
            'generic-autocomplete', 'generic-placeholder-only', 'generic-bracketed-indexed',
            'generic-confirm-traps', 'generic-hidden-wizard', 'generic-shadow-nested',
            'qa-open-ended', 'qa-cover-letter-exclude', 'qa-short-label-exclude',
            'qa-profile-match-exclude', 'qa-resume-file-vs-coverletter-file',
            'jd-jsonld-jobposting', 'jd-plain-html', 'apply-landing', 'apply-landing-form',
            'jd-multi-page-application',
        ], true), 404);

        return view("dev.job-fixtures.{$page}");
    })->name('dev.job-fixtures.show');
}

require __DIR__.'/auth.php';
