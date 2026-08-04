<?php

namespace App\Services;

use App\Support\ResumeDocument;

/**
 * Every feature in the app is free and unlimited. Nothing is metered — AI was the last
 * metered thing and it has been removed. What survives here is the template allowlist,
 * which several controllers validate against.
 */
class UserLimits
{
    /**
     * @return list<string>
     */
    public static function allTemplates(): array
    {
        return ResumeDocument::TEMPLATES;
    }
}
