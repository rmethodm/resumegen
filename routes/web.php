<?php

use App\Http\Controllers\Auth\ConfirmedTwoFactorController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\TwoFactorRecoveryCodesController;
use App\Http\Controllers\AutocompleteController;
use App\Http\Controllers\CareerHubController;
use App\Http\Controllers\CoverLetterController;
use App\Http\Controllers\HeatmapController;
use App\Http\Controllers\InterviewCoachController;
use App\Http\Controllers\JobSearchController;
use App\Http\Controllers\MessagesController;
use App\Http\Controllers\OgImageController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicResumeController;
use App\Http\Controllers\PublicThreadController;
use App\Http\Controllers\ResumeBuilderController;
use App\Http\Controllers\ResumeImportController;
use App\Http\Controllers\ResumePhotoController;
use App\Http\Controllers\ResumeTagController;
use App\Http\Controllers\ResumeThreadController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SectionEventController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Controllers\StrengthScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class);

Route::get('/privacy', [LegalController::class, 'privacy'])->name('legal.privacy');
Route::get('/terms', [LegalController::class, 'terms'])->name('legal.terms');

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

    // Job Imports: real search (Adzuna/USAJOBS) + persistence. AI job match
    // (score + missing skills, via ResumeAiController::matchJob) is real too.
    // Gap analysis and cover letters are still frontend stubs.
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
        Route::post('/resumes/{resume}/ai/match-job', [ResumeAiController::class, 'matchJob'])
            ->name('resumes.ai.match-job');
    });

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
        ->name('two-factor.enable');
    Route::post('/user/confirmed-two-factor-authentication', [ConfirmedTwoFactorController::class, 'store'])
        ->name('two-factor.confirm');
    Route::delete('/user/two-factor-authentication', [TwoFactorController::class, 'destroy'])
        ->middleware('password.confirm')
        ->name('two-factor.disable');
    Route::post('/user/two-factor-recovery-codes', [TwoFactorRecoveryCodesController::class, 'store'])
        ->name('two-factor.recovery-codes');

    Route::get('/builder', [ResumeBuilderController::class, 'index'])->name('builder.index');
    Route::post('/builder', [ResumeBuilderController::class, 'store'])->name('builder.store');
    Route::get('/builder/create', [ResumeBuilderController::class, 'create'])->name('builder.create');
    Route::post('/import/pdf/confirm', [ResumeImportController::class, 'confirm'])->name('import.pdf.confirm');
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
    Route::put('/builder/{resume}', [ResumeBuilderController::class, 'update'])->name('builder.update');
    Route::delete('/builder/{resume}', [ResumeBuilderController::class, 'destroy'])->name('builder.destroy');
    Route::get('/builder/{resume}/pdf', [ResumeBuilderController::class, 'downloadPdf'])->name('builder.pdf');
    Route::get('/builder/{resume}/docx', [ResumeBuilderController::class, 'downloadDocx'])->name('builder.docx');
    Route::get('/builder/{resume}/preview', [ResumeBuilderController::class, 'previewPdf'])->name('builder.preview');
    Route::get('/builder/{resume}/html-preview', [ResumeBuilderController::class, 'htmlPreview'])->name('builder.html-preview');
    Route::get('/builder/{resume}/thumbnail', [ResumeBuilderController::class, 'thumbnail'])->name('builder.thumbnail');
    Route::post('/builder/{resume}/beacon', [ResumeBuilderController::class, 'beacon'])->name('builder.beacon');
    Route::post('/builder/{resume}/duplicate', [ResumeBuilderController::class, 'duplicate'])->name('builder.duplicate');
    Route::post('/builder/{resume}/create-variant', [ResumeBuilderController::class, 'createVariant'])->name('builder.create-variant');
    Route::get('/builder/{resume}/heatmap', [HeatmapController::class, 'show'])->name('builder.heatmap');
    Route::get('/builder/{resume}/strength-score', [StrengthScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.strength-score');
    Route::get('/builder/{resume}/share-url', [ResumeBuilderController::class, 'shareUrl'])->name('builder.share-url');
    Route::post('/builder/{resume}/photo', [ResumePhotoController::class, 'store'])->name('builder.photo.store');
    Route::delete('/builder/{resume}/photo', [ResumePhotoController::class, 'destroy'])->name('builder.photo.destroy');
    Route::post('/builder/{resume}/tags', [ResumeTagController::class, 'store'])->name('builder.tags.store');
    Route::delete('/builder/{resume}/tags/{tag}', [ResumeTagController::class, 'destroy'])->name('builder.tags.destroy');

    Route::get('/search', SearchController::class)->name('search')->middleware('throttle:30,1');

    Route::middleware(['ai_enabled', 'throttle:20,1'])->group(function () {
        Route::post('/builder/{resume}/ai/rewrite-bullet', [AiSuggestionController::class, 'rewriteBullet'])->name('builder.ai.rewrite-bullet');
        Route::post('/builder/{resume}/ai/critique-bullet', [AiSuggestionController::class, 'critiqueBullet'])->name('builder.ai.critique-bullet');
        Route::post('/builder/{resume}/ai/summary', [AiSuggestionController::class, 'summary'])->name('builder.ai.summary');
        Route::post('/builder/{resume}/ai/ats-keywords', [AiSuggestionController::class, 'atsKeywords'])->name('builder.ai.ats-keywords');
        Route::post('/builder/{resume}/interview-coach', [InterviewCoachController::class, 'coach'])->name('builder.interview-coach');
        Route::post('/cover-letters/{letter}/ai/draft', [AiSuggestionController::class, 'coverLetterDraft'])->name('cover-letters.ai.draft');
        Route::post('/import/pdf/extract', [ResumeImportController::class, 'extract'])->name('import.pdf.extract');
        Route::post('/jobs/rank', [JobSearchController::class, 'rank'])->name('jobs.rank');
        Route::post('/jobs/import-url', [JobSearchController::class, 'importUrl'])->name('jobs.import-url');
    });

    Route::post('/builder/{resume}/share', [ShareLinkController::class, 'store'])->name('share.store');
    Route::patch('/builder/{resume}/share/{link}', [ShareLinkController::class, 'update'])->name('share.update');
    Route::delete('/builder/{resume}/share/{link}', [ShareLinkController::class, 'destroy'])->name('share.destroy');
    Route::get('/shares', [ShareController::class, 'index'])->name('shares.index');
    Route::get('/builder/{resume}/threads/{thread}', [ResumeThreadController::class, 'show'])->name('builder.thread');
    Route::post('/builder/{resume}/threads/{thread}/reply', [ResumeThreadController::class, 'reply'])->name('builder.thread.reply');
    Route::patch('/builder/{resume}/threads/{thread}/read', [ResumeThreadController::class, 'read'])->name('builder.thread.read');
    Route::delete('/builder/{resume}/threads/{thread}', [ResumeThreadController::class, 'destroy'])->name('builder.thread.destroy');

    Route::get('/cover-letters', [CoverLetterController::class, 'index'])->name('cover-letters.index');
    Route::post('/cover-letters', [CoverLetterController::class, 'store'])->name('cover-letters.store');
    Route::get('/cover-letters/{letter}', [CoverLetterController::class, 'edit'])->name('cover-letters.edit');
    Route::put('/cover-letters/{letter}', [CoverLetterController::class, 'update'])->name('cover-letters.update');
    Route::delete('/cover-letters/{letter}', [CoverLetterController::class, 'destroy'])->name('cover-letters.destroy');

    Route::get('/jobs/salary', [SalaryController::class, 'hint'])->name('jobs.salary')->middleware('throttle:30,1');

    Route::get('/jobs', [JobSearchController::class, 'index'])->name('jobs.index');
    Route::post('/jobs/search', [JobSearchController::class, 'search'])->name('jobs.search')->middleware('throttle:30,1');
    Route::post('/jobs/saved', [JobSearchController::class, 'store'])->name('jobs.saved.store');
    Route::patch('/jobs/saved/{jobSearch}', [JobSearchController::class, 'update'])->name('jobs.saved.update');
    Route::delete('/jobs/saved/{jobSearch}', [JobSearchController::class, 'destroy'])->name('jobs.saved.destroy');

    Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');
    Route::patch('/messages/read-all', [MessagesController::class, 'markAllRead'])->name('messages.read-all');

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
        abort_unless(in_array($page, ['workday', 'greenhouse', 'lever', 'icims', 'custom'], true), 404);

// Public (unauthenticated) Career Hub routes
Route::get('/career', [CareerHubController::class, 'index'])->name('career.index');
Route::get('/career/{slug}', [CareerHubController::class, 'show'])->name('career.show');

// Public (unauthenticated) share link routes
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
    Route::post('/r/{token}/unlock', [PublicResumeController::class, 'unlock'])->name('public.resume.unlock');
});
Route::middleware('throttle:20,1')->group(function () {
    Route::get('/r/{token}/pdf', [PublicResumeController::class, 'downloadPdf'])->name('public.pdf');
    Route::get('/r/{token}/docx', [PublicResumeController::class, 'downloadDocx'])->name('public.docx');
});
Route::post('/r/{token}/threads', [PublicThreadController::class, 'store'])->middleware('throttle:5,1')->name('public.thread.store');
Route::post('/r/{token}/threads/{thread}/messages', [PublicThreadController::class, 'addMessage'])->middleware('throttle:10,1')->name('public.thread.message');
Route::get('/r/{token}/og-image', [OgImageController::class, 'show'])->name('public.og-image')->middleware('throttle:30,1');
Route::post('/r/{token}/section-events', [SectionEventController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('public.section-events');

Route::middleware('auth')->delete('/admin/impersonate', [AdminImpersonationController::class, 'destroy'])->name('admin.impersonate.destroy');

require __DIR__.'/auth.php';
