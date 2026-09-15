<?php

namespace App\Support;

/**
 * Turns a standard 5-field cron expression into a human sentence for the
 * admin schedule UI. Covers the common daily/hourly/weekly shapes this
 * app's schedule actually uses; anything more exotic falls back to the
 * raw expression rather than guessing.
 */
class CronExplainer
{
    private const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    public static function explain(string $cronExpression): string
    {
        $fields = preg_split('/\s+/', trim($cronExpression));

        if (! is_array($fields) || count($fields) !== 5) {
            return "Custom schedule: {$cronExpression}";
        }

        [$minute, $hour, $dayOfMonth, $month, $dayOfWeek] = $fields;

        if ($dayOfMonth === '*' && $month === '*') {
            if ($dayOfWeek === '*' && self::isNumber($minute) && self::isNumber($hour)) {
                return sprintf('Daily at %s', self::formatTime((int) $hour, (int) $minute));
            }

            if ($dayOfWeek !== '*' && self::isNumber($dayOfWeek) && self::isNumber($minute) && self::isNumber($hour)) {
                $day = self::DAYS[(int) $dayOfWeek % 7] ?? "day {$dayOfWeek}";

                return sprintf('Weekly on %s at %s', $day, self::formatTime((int) $hour, (int) $minute));
            }

            if ($dayOfWeek === '*' && $hour === '*' && self::isNumber($minute)) {
                return sprintf('Every hour at :%02d', (int) $minute);
            }

            if ($dayOfWeek === '*' && $minute === '*' && $hour === '*') {
                return 'Every minute';
            }
        }

        return "Custom schedule: {$cronExpression}";
    }

    private static function isNumber(string $field): bool
    {
        return preg_match('/^\d+$/', $field) === 1;
    }

    private static function formatTime(int $hour, int $minute): string
    {
        $period = $hour >= 12 ? 'PM' : 'AM';
        $displayHour = $hour % 12 === 0 ? 12 : $hour % 12;

        return sprintf('%d:%02d %s', $displayHour, $minute, $period);
    }
}
