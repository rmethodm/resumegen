<?php

use App\Http\Controllers\Api\AiSuggestController;
use App\Http\Controllers\Api\AtsScoreController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ResumeController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('resumes', ResumeController::class);
    Route::post('resumes/{resume}/duplicate', [ResumeController::class, 'duplicate']);
    Route::post('resumes/{resume}/ai-suggest', [AiSuggestController::class, 'suggest'])
        ->middleware('throttle:10,1');
    Route::get('resumes/{resume}/ats-score', [AtsScoreController::class, 'show'])
        ->middleware('throttle:10,1');
});
