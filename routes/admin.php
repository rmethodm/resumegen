<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
| Support admin — domain-scoped via bootstrap/app.php (APP_ADMIN_DOMAIN).
| Admins log in on this host; session cookies are host-only by default.
*/

Route::middleware(['auth', 'verified', 'admin'])->group(function () {
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
});
