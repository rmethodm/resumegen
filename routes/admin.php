<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
| Support admin — domain-scoped via bootstrap/app.php (APP_ADMIN_DOMAIN).
| Admins log in on this host; session cookies are host-only by default.
*/

Route::middleware(['auth', 'verified', 'two_factor_challenge', 'admin'])->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('admin.dashboard');

    Route::get('/users', [UserController::class, 'index'])->name('admin.users.index');
    Route::get('/users/{user}', [UserController::class, 'show'])->name('admin.users.show');

    Route::post('/users/{user}/verify-email', [UserController::class, 'verifyEmail'])
        ->middleware('throttle:30,1')
        ->name('admin.users.verify-email');
    Route::post('/users/{user}/resend-verification', [UserController::class, 'resendVerification'])
        ->middleware('throttle:30,1')
        ->name('admin.users.resend-verification');
    Route::post('/users/{user}/disable', [UserController::class, 'disable'])
        ->middleware('throttle:30,1')
        ->name('admin.users.disable');
    Route::post('/users/{user}/enable', [UserController::class, 'enable'])
        ->middleware('throttle:30,1')
        ->name('admin.users.enable');
    Route::post('/users/{user}/revoke-tokens', [UserController::class, 'revokeTokens'])
        ->middleware('throttle:30,1')
        ->name('admin.users.revoke-tokens');

    Route::get('/backups', [BackupController::class, 'index'])->name('admin.backups.index');
    Route::post('/backups', [BackupController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('admin.backups.store');
    Route::get('/backups/{filename}', [BackupController::class, 'download'])
        ->where('filename', 'resumegen-\d{8}-\d{6}\.sql\.gz')
        ->name('admin.backups.download');
    Route::delete('/backups/{filename}', [BackupController::class, 'destroy'])
        ->middleware('throttle:30,1')
        ->where('filename', 'resumegen-\d{8}-\d{6}\.sql\.gz')
        ->name('admin.backups.destroy');
    Route::post('/backups/{filename}/restore', [BackupController::class, 'restore'])
        ->middleware('throttle:5,1')
        ->where('filename', 'resumegen-\d{8}-\d{6}\.sql\.gz')
        ->name('admin.backups.restore');
});
