<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CoverLetterController;
use App\Http\Controllers\Api\ResumeController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('resumes', ResumeController::class);
    Route::post('resumes/{resume}/duplicate', [ResumeController::class, 'duplicate']);
    Route::get('resumes/{resume}/pdf', [ResumeController::class, 'pdf']);
    Route::apiResource('cover-letters', CoverLetterController::class)
        ->names('api.cover-letters');
    Route::get('/activity', [ActivityController::class, 'index']);
});
