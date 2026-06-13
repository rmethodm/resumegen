<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModerationException extends Exception
{
    public const USER_MESSAGE = "This content can't be processed.";

    public function render(Request $request): JsonResponse
    {
        return response()->json(['error' => self::USER_MESSAGE], 422);
    }
}
