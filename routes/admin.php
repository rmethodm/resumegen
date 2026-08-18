<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DatabaseController;
use App\Http\Controllers\Admin\DatabaseQueryController;
use App\Http\Controllers\Admin\DatabaseRoleController;
use App\Http\Controllers\Admin\DatabaseTableController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VisitorController;
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

    Route::get('/visitors', [VisitorController::class, 'index'])->name('admin.visitors.index');

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

    Route::get('/database', [DatabaseController::class, 'index'])->name('admin.database.index');

    Route::get('/database/tables/{table}', [DatabaseTableController::class, 'show'])
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.show');
    Route::patch('/database/tables/{table}/rows/{id}', [DatabaseTableController::class, 'updateRow'])
        ->middleware('throttle:30,1')
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.rows.update');
    Route::delete('/database/tables/{table}/rows/{id}', [DatabaseTableController::class, 'destroyRow'])
        ->middleware('throttle:30,1')
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.rows.destroy');
    Route::post('/database/tables/{table}/columns', [DatabaseTableController::class, 'addColumn'])
        ->middleware('throttle:10,1')
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.columns.store');
    Route::delete('/database/tables/{table}/columns/{column}', [DatabaseTableController::class, 'dropColumn'])
        ->middleware('throttle:10,1')
        ->where(['table' => '[a-zA-Z0-9_]+', 'column' => '[a-zA-Z0-9_]+'])
        ->name('admin.database.tables.columns.destroy');
    Route::post('/database/tables/{table}/indexes', [DatabaseTableController::class, 'addIndex'])
        ->middleware('throttle:10,1')
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.indexes.store');
    Route::delete('/database/tables/{table}/indexes/{index}', [DatabaseTableController::class, 'dropIndex'])
        ->middleware('throttle:10,1')
        ->where(['table' => '[a-zA-Z0-9_]+', 'index' => '[a-zA-Z0-9_]+'])
        ->name('admin.database.tables.indexes.destroy');
    Route::post('/database/tables/{table}/truncate', [DatabaseTableController::class, 'truncate'])
        ->middleware('throttle:5,1')
        ->where('table', '[a-zA-Z0-9_]+')
        ->name('admin.database.tables.truncate');

    Route::get('/database/query', [DatabaseQueryController::class, 'index'])->name('admin.database.query');
    Route::post('/database/query', [DatabaseQueryController::class, 'run'])
        ->middleware('throttle:20,1')
        ->name('admin.database.query.run');
    Route::post('/database/query/explain', [DatabaseQueryController::class, 'explain'])
        ->middleware('throttle:20,1')
        ->name('admin.database.query.explain');

    Route::get('/database/roles', [DatabaseRoleController::class, 'index'])->name('admin.database.roles');
    Route::post('/database/roles', [DatabaseRoleController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('admin.database.roles.store');
    Route::post('/database/roles/{role}/grant', [DatabaseRoleController::class, 'grant'])
        ->middleware('throttle:10,1')
        ->where('role', '[a-zA-Z0-9_]+')
        ->name('admin.database.roles.grant');
    Route::post('/database/roles/{role}/revoke', [DatabaseRoleController::class, 'revoke'])
        ->middleware('throttle:10,1')
        ->where('role', '[a-zA-Z0-9_]+')
        ->name('admin.database.roles.revoke');
    Route::delete('/database/roles/{role}', [DatabaseRoleController::class, 'destroy'])
        ->middleware('throttle:5,1')
        ->where('role', '[a-zA-Z0-9_]+')
        ->name('admin.database.roles.destroy');
});
