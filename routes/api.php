<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CoverLetterController;
use App\Http\Controllers\Api\PushTokenController;
use App\Http\Controllers\Api\ResignationLetterController;
use App\Http\Controllers\Api\ResumeController;
use App\Http\Controllers\Api\ThreadReplyController;
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
    Route::post('cover-letters/{coverLetter}/generate', [CoverLetterController::class, 'generate']);
    Route::apiResource('resignation-letters', ResignationLetterController::class)
        ->names('api.resignation-letters');
    Route::get('/activity', [ActivityController::class, 'index']);
    Route::post('/threads/{thread}/reply', [ThreadReplyController::class, 'store'])->middleware('throttle:20,1');
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);
});
