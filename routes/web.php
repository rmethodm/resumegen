<?php

use App\Http\Controllers\Admin\AdminUsageController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\CareerController as AdminCareerController;
use App\Http\Controllers\AiSuggestController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\ApplicationContactController;
use App\Http\Controllers\AtsScoreController;
use App\Http\Controllers\Auth\ConfirmedTwoFactorController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\TwoFactorRecoveryCodesController;
use App\Http\Controllers\AutocompleteController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CareerHubController;
use App\Http\Controllers\CareerPathController;
use App\Http\Controllers\CoverLetterController;
use App\Http\Controllers\CoverLetterTailorController;
use App\Http\Controllers\GrammarCheckController;
use App\Http\Controllers\HeatmapController;
use App\Http\Controllers\InterviewCoachController;
use App\Http\Controllers\InterviewNoteController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\MockInterviewController;
use App\Http\Controllers\NegotiationScriptController;
use App\Http\Controllers\OgImageController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\OrgController;
use App\Http\Controllers\OrgInviteController;
use App\Http\Controllers\OrgJoinController;
use App\Http\Controllers\OrgResumeController;
use App\Http\Controllers\PdfImportController;
use App\Http\Controllers\PersonalTokenController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicResumeController;
use App\Http\Controllers\QuantifyBulletController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\ResumeBuilderController;
use App\Http\Controllers\ResumeGeneratorController;
use App\Http\Controllers\ResumePhotoController;
use App\Http\Controllers\ResumeTagController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\SectionEventController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Controllers\StrengthScoreController;
use App\Http\Controllers\TailorController;
use App\Http\Controllers\UsageController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

Route::get('/dashboard', [AnalyticsController::class, 'index'])
    ->middleware(['auth', 'verified', 'two_factor_challenge'])
    ->name('dashboard');

Route::middleware(['auth', 'two_factor_challenge'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/tokens', [PersonalTokenController::class, 'store'])->name('profile.tokens.store');
    Route::delete('/profile/tokens/{tokenId}', [PersonalTokenController::class, 'destroy'])->name('profile.tokens.destroy');

    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::patch('/user/onboarding', [OnboardingController::class, 'complete'])->name('onboarding.complete');
    Route::patch('/user/profile-info', [ProfileController::class, 'updatePersona'])->name('profile.persona');

    Route::get('/settings/portfolio', [PortfolioController::class, 'edit'])->name('portfolio.edit');
    Route::patch('/settings/portfolio', [PortfolioController::class, 'update'])->name('portfolio.update');

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
    Route::get('/builder/{resume}', [ResumeBuilderController::class, 'edit'])->name('builder.edit');
    Route::put('/builder/{resume}', [ResumeBuilderController::class, 'update'])->name('builder.update');
    Route::delete('/builder/{resume}', [ResumeBuilderController::class, 'destroy'])->name('builder.destroy');
    Route::get('/builder/{resume}/pdf', [ResumeBuilderController::class, 'downloadPdf'])->name('builder.pdf');
    Route::get('/builder/{resume}/docx', [ResumeBuilderController::class, 'downloadDocx'])->name('builder.docx');
    Route::get('/builder/{resume}/preview', [ResumeBuilderController::class, 'previewPdf'])->name('builder.preview');
    Route::post('/builder/{resume}/beacon', [ResumeBuilderController::class, 'beacon'])->name('builder.beacon');
    Route::post('/builder/{resume}/duplicate', [ResumeBuilderController::class, 'duplicate'])->name('builder.duplicate');
    Route::post('/builder/{resume}/create-variant', [ResumeBuilderController::class, 'createVariant'])->name('builder.create-variant');
    Route::patch('/builder/{resume}/set-master', [ResumeBuilderController::class, 'setMaster'])->name('builder.set-master');
    Route::patch('/builder/{resume}/link-job', [ResumeBuilderController::class, 'linkJob'])->name('builder.link-job');
    Route::post('/builder/{resume}/create-tailored-copy', [ResumeBuilderController::class, 'createTailoredCopy'])->name('builder.create-tailored-copy');
    Route::patch('/builder/{resume}/sync-master', [ResumeBuilderController::class, 'syncMaster'])->name('builder.sync-master');
    Route::post('/builder/{resume}/pull-from-master', [ResumeBuilderController::class, 'pullFromMaster'])->name('builder.pull-from-master');
    Route::get('/builder/{resume}/ab-compare', [ResumeBuilderController::class, 'abCompare'])->name('builder.ab-compare');
    Route::get('/builder/{resume}/compare', [ResumeBuilderController::class, 'compare'])->name('builder.compare');
    Route::get('/builder/{resume}/heatmap', [HeatmapController::class, 'show'])->name('builder.heatmap');
    Route::post('/builder/{resume}/versions', [ResumeBuilderController::class, 'saveVersion'])->name('builder.save-version');
    Route::post('/builder/{resume}/ai-suggest', [AiSuggestController::class, 'suggest'])
        ->middleware('throttle:10,1')
        ->name('builder.ai-suggest');
    Route::post('/builder/{resume}/tailor', [TailorController::class, 'tailor'])
        ->middleware('throttle:5,1')
        ->name('builder.tailor');
    Route::post('/builder/{resume}/interview-coach', [InterviewCoachController::class, 'coach'])
        ->middleware('throttle:5,1')
        ->name('builder.interview-coach');
    Route::post('/builder/{resume}/mock-interview', [MockInterviewController::class, 'chat'])
        ->middleware('throttle:10,1')
        ->name('builder.mock-interview');
    Route::post('/builder/{resume}/quantify-bullet', [QuantifyBulletController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('builder.quantify-bullet');
    Route::post('/builder/{resume}/grammar-check', [GrammarCheckController::class, 'check'])
        ->middleware('throttle:5,1')
        ->name('builder.grammar-check');
    Route::get('/builder/{resume}/ats-score', [AtsScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.ats-score');
    Route::delete('/builder/{resume}/ats-score', [AtsScoreController::class, 'destroy'])
        ->name('builder.ats-score.destroy');
    Route::get('/builder/{resume}/career-paths', [CareerPathController::class, 'show'])
        ->middleware('throttle:5,1')
        ->name('builder.career-paths');
    Route::delete('/builder/{resume}/career-paths', [CareerPathController::class, 'destroy'])
        ->name('builder.career-paths.destroy');
    Route::get('/builder/{resume}/strength-score', [StrengthScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.strength-score');
    Route::get('/builder/{resume}/share-url', [ResumeBuilderController::class, 'shareUrl'])->name('builder.share-url');
    Route::post('/builder/{resume}/photo', [ResumePhotoController::class, 'store'])->name('builder.photo.store');
    Route::delete('/builder/{resume}/photo', [ResumePhotoController::class, 'destroy'])->name('builder.photo.destroy');
    Route::post('/builder/{resume}/tags', [ResumeTagController::class, 'store'])->name('builder.tags.store');
    Route::delete('/builder/{resume}/tags/{tag}', [ResumeTagController::class, 'destroy'])->name('builder.tags.destroy');

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
    Route::post('/cover-letters/{letter}/ai-tailor', [CoverLetterTailorController::class, 'tailor'])
        ->name('cover-letters.ai-tailor')
        ->middleware('throttle:5,1');

    Route::get('/jobs', [JobApplicationController::class, 'index'])->name('jobs.index');
    Route::post('/jobs', [JobApplicationController::class, 'store'])->name('jobs.store');
    Route::get('/jobs/salary', [SalaryController::class, 'hint'])->name('jobs.salary')->middleware('throttle:30,1');
    Route::get('/jobs/{application}', [JobApplicationController::class, 'edit'])->name('jobs.edit');
    Route::put('/jobs/{application}', [JobApplicationController::class, 'update'])->name('jobs.update');
    Route::delete('/jobs/{application}', [JobApplicationController::class, 'destroy'])->name('jobs.destroy');
    Route::post('/jobs/{application}/notes', [InterviewNoteController::class, 'store'])->name('jobs.notes.store');
    Route::delete('/jobs/{application}/notes/{note}', [InterviewNoteController::class, 'destroy'])->name('jobs.notes.destroy');
    Route::post('/jobs/{application}/contacts', [ApplicationContactController::class, 'store'])->name('jobs.contacts.store');
    Route::delete('/jobs/{application}/contacts/{contact}', [ApplicationContactController::class, 'destroy'])->name('jobs.contacts.destroy');
    Route::post('/jobs/{job}/negotiation-script', [NegotiationScriptController::class, 'store'])
        ->name('jobs.negotiation-script')
        ->middleware('throttle:5,1');

    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');

    Route::get('/usage', [UsageController::class, 'index'])->name('usage.index');
    Route::get('/settings/referral', [ReferralController::class, 'show'])->name('referral.show');
    Route::get('/messages', fn () => Inertia::render('Messages/Index'))->name('messages.index');

    Route::post('/builder/generate', [ResumeGeneratorController::class, 'generate'])
        ->name('builder.generate')
        ->middleware('throttle:3,1');

    Route::post('/import/pdf', [PdfImportController::class, 'extract'])
        ->name('import.pdf.extract')
        ->middleware('throttle:5,1');
    Route::post('/import/pdf/confirm', [PdfImportController::class, 'confirm'])
        ->name('import.pdf.confirm');

    Route::get('/webhooks', [WebhookController::class, 'index'])->name('webhooks.index');
    Route::post('/webhooks', [WebhookController::class, 'store'])->name('webhooks.store');
    Route::delete('/webhooks/{endpoint}', [WebhookController::class, 'destroy'])->name('webhooks.destroy');

    // Autocomplete lookup
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/autocomplete/job-roles', [AutocompleteController::class, 'searchRoles'])->name('autocomplete.job-roles.search');
        Route::get('/autocomplete/job-titles', [AutocompleteController::class, 'searchTitles'])->name('autocomplete.job-titles.search');
    });
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/autocomplete/job-roles', [AutocompleteController::class, 'storeRole'])->name('autocomplete.job-roles.store');
        Route::post('/autocomplete/job-titles', [AutocompleteController::class, 'storeTitle'])->name('autocomplete.job-titles.store');
    });

    // Org workspace
    Route::get('/org/create', [OrgController::class, 'create'])->name('org.create');
    Route::post('/org', [OrgController::class, 'store'])->name('org.store');
    Route::get('/org', [OrgController::class, 'show'])->name('org.show');

    Route::middleware('org.admin')->group(function () {
        Route::patch('/org', [OrgController::class, 'update'])->name('org.update');
        Route::post('/org/invite', [OrgInviteController::class, 'store'])->name('org.invite.store');
        Route::delete('/org/members/{member}', [OrgInviteController::class, 'destroy'])->name('org.invite.destroy');
        Route::get('/org/resumes/{resume}', [OrgResumeController::class, 'show'])->name('org.resume.show');
        Route::get('/org/resumes/{resume}/preview', [OrgResumeController::class, 'preview'])->name('org.resume.preview');
        Route::put('/org/resumes/{resume}/notes', [OrgResumeController::class, 'upsertNote'])->name('org.resume.notes');
    });
});

Route::get('/ref/{code}', [ReferralController::class, 'redirect'])->name('referral.redirect');

// Org invite join — unauthenticated, token-based
Route::middleware('throttle:10,1')->group(function () {
    Route::get('/org/join/{token}', [OrgJoinController::class, 'show'])->name('org.join.show');
    Route::post('/org/join/{token}', [OrgJoinController::class, 'store'])->name('org.join.store');
});

// Public (unauthenticated) portfolio page
Route::get('/p/{slug}', [PortfolioController::class, 'show'])->name('portfolio.show');

// Public (unauthenticated) Career Hub routes
Route::get('/career', [CareerHubController::class, 'index'])->name('career.index');
Route::get('/career/{slug}', [CareerHubController::class, 'show'])->name('career.show');

// Public (unauthenticated) share link routes
Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
Route::get('/r/{token}/pdf', [PublicResumeController::class, 'downloadPdf'])->name('public.pdf');
Route::get('/r/{token}/docx', [PublicResumeController::class, 'downloadDocx'])->name('public.docx');
Route::post('/r/{token}/questions', [PublicResumeController::class, 'storeQuestion'])->middleware('throttle:5,1')->name('public.question');
Route::get('/r/{token}/og-image', [OgImageController::class, 'show'])->name('public.og-image');
Route::post('/r/{token}/section-events', [SectionEventController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('public.section-events');

Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/usage', [AdminUsageController::class, 'index'])->name('usage');
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/toggle-pro', [AdminUserController::class, 'togglePro'])->name('users.toggle-pro');
    Route::patch('/users/{user}/toggle-agency', [AdminUserController::class, 'toggleAgency'])->name('users.toggle-agency');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
    Route::resource('career', AdminCareerController::class)->names([
        'index' => 'career.index',
        'create' => 'career.create',
        'store' => 'career.store',
        'edit' => 'career.edit',
        'update' => 'career.update',
        'destroy' => 'career.destroy',
    ])->except(['show']);
});

require __DIR__.'/auth.php';
