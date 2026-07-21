<?php

namespace App\Services;

/**
 * Every feature in the app is free and unlimited. Nothing is metered — AI was the last
 * metered thing and it has been removed. What survives here is the template allowlist,
 * which several controllers validate against.
 */
class UserLimits
{
    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'executive', 'ats',
        'skills-first', 'academic', 'bold',
    ];

    /**
     * @return list<string>
     */
    public static function allTemplates(): array
    {
        return self::ALL_TEMPLATES;
    }
}
