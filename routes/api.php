<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ThreadReplyController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/activity', [ActivityController::class, 'index']);
    Route::post('/threads/{thread}/reply', [ThreadReplyController::class, 'store'])->middleware('throttle:20,1');
});
