<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PublicUrl implements ValidationRule
{
    private const BLOCKED_PATTERNS = [
        '/^https?:\/\/localhost/i',
        '/^https?:\/\/127\./i',
        '/^https?:\/\/0\./i',
        '/^https?:\/\/10\./i',
        '/^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i',
        '/^https?:\/\/192\.168\./i',
        '/^https?:\/\/169\.254\./i',
        '/^https?:\/\/\[::1\]/i',
        '/^https?:\/\/\[fc/i',
        '/^https?:\/\/\[fd/i',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        foreach (self::BLOCKED_PATTERNS as $pattern) {
            if (preg_match($pattern, (string) $value)) {
                $fail('The :attribute must be a publicly accessible URL.');

                return;
            }
        }

        if (! preg_match('/^https?:\/\//i', (string) $value)) {
            $fail('The :attribute must use http or https.');
        }
    }
}
