<?php

namespace App\Services;

use App\Support\ResumeDocument;

/**
 * Template allowlist used by several controllers when validating resume templates.
 * AI metering lived here previously and has been removed.
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
