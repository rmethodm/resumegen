<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when App\Services\AiService is called while `ai.enabled` is false.
 *
 * The route middleware normally stops requests earlier; this catches the
 * callers that never pass through HTTP, such as jobs and console commands.
 */
class AiDisabledException extends Exception
{
    public const USER_MESSAGE = 'AI features are currently unavailable.';
}
