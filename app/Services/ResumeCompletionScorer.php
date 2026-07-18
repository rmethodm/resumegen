<?php

namespace App\Services;

use App\Models\Resume;

class ResumeCompletionScorer
{
    public static function score(Resume $resume): int
    {
        $score = 0;
        $c = $resume->contact ?? [];

        if (! empty($c['full_name'])) {
            $score += 8;
        }
        if (! empty($c['email'])) {
            $score += 8;
        }
        if (! empty($c['phone'])) {
            $score += 5;
        }
        if (! empty($c['location'])) {
            $score += 5;
        }
        if (! empty($c['title'])) {
            $score += 5;
        }

        if (! empty($resume->summary) && strlen($resume->summary) >= 50) {
            $score += 20;
        }

        $exp = $resume->experience ?? [];
        if (count($exp) > 0) {
            $score += 15;
        }
        if (count(array_filter($exp, fn ($e) => ! empty($e['bullets']))) > 0) {
            $score += 5;
        }

        if (count($resume->education ?? []) > 0) {
            $score += 12;
        }
        if (count($resume->skills ?? []) > 0) {
            $score += 7;
        }
        if (count($resume->certifications ?? []) > 0) {
            $score += 5;
        }

        return min(100, $score);
    }
}
