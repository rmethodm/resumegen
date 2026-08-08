<?php

namespace App\Support;

/**
 * Token identity for the iPhone app's Sanctum connection, parallel to
 * {@see ResumeFillProfile}'s TOKEN_NAME/TOKEN_ABILITY for the extension.
 */
final class MobileApiToken
{
    public const TOKEN_NAME = 'Resumegen Mobile';

    public const TOKEN_ABILITY = 'mobile';
}
