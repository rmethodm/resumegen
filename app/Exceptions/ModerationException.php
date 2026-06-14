<?php

namespace App\Exceptions;

use Exception;

class ModerationException extends Exception
{
    public const USER_MESSAGE = "This content can't be processed.";
}
