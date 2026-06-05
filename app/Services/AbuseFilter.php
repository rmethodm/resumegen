<?php

namespace App\Services;

class AbuseFilter
{
    private static array $patterns = [
        '/ignore\s+(previous\s+|all\s+|above\s+)?instructions/i',
        '/pretend\s+you\s+(are|were)/i',
        '/\bact\s+as\s+(a\s+|an\s+)?/i',
        '/\byou\s+are\s+now\b/i',
        '/\bjailbreak\b/i',
        '/disregard\s+your\s+(training|guidelines|rules)/i',
        '/forget\s+(your\s+|all\s+)?(previous\s+|prior\s+)?(instructions|training|context)/i',
    ];

    public static function check(string $text): bool
    {
        foreach (self::$patterns as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }

        return false;
    }
}
