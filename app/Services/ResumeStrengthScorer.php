<?php

namespace App\Services;

use App\Models\Resume;

class ResumeStrengthScorer
{
    public static function score(Resume $resume): array
    {
        $points = 0;
        $tips = [];
        $order = 0;

        $contact = $resume->contact ?? [];
        $experience = $resume->experience ?? [];
        $education = $resume->education ?? [];
        $skills = $resume->skills ?? [];
        $certifications = $resume->certifications ?? [];
        $customSections = $resume->custom_sections ?? [];

        // Professional summary — 15pts (checked first so it wins ties with contact)
        if (! empty($resume->summary)) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add a professional summary'];
        }

        // Contact info complete — 15pts
        if (! empty($contact['full_name']) && ! empty($contact['email']) && ! empty($contact['location'])) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Complete your contact information'];
        }

        // At least 1 experience — 15pts
        if (count($experience) >= 1) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add at least one work experience'];
        }

        // Education — 10pts
        if (count($education) >= 1) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add your education'];
        }

        // At least 3 skills — 10pts (skills is a plain string[])
        if (count($skills) >= 3) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add at least 3 skills'];
        }

        // Bullet with number or metric — 10pts
        // bullets is a newline-separated string per experience entry
        $allBullets = collect($experience)
            ->flatMap(fn ($e) => array_filter(explode("\n", $e['bullets'] ?? '')))
            ->all();
        $hasMetric = collect($allBullets)->contains(fn ($b) => (bool) preg_match('/\d/', $b));
        if ($hasMetric) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add numbers or metrics to your bullets'];
        }

        // At least 2 experiences — 10pts
        if (count($experience) >= 2) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add a second work experience'];
        }

        // LinkedIn URL — 5pts
        if (! empty($contact['linkedin'])) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add your LinkedIn URL'];
        }

        // At least one experience with 3+ bullets — 5pts
        $hasRichBullets = collect($experience)
            ->contains(fn ($e) => count(array_filter(explode("\n", $e['bullets'] ?? ''))) >= 3);
        if ($hasRichBullets) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add 3+ bullets to a work experience entry'];
        }

        // Custom section or certification — 5pts
        if (count($certifications) >= 1 || count($customSections) >= 1) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add a certification or custom section'];
        }

        // Stable sort: highest pts first; preserve insertion order on ties
        usort($tips, fn ($a, $b) => $b['pts'] !== $a['pts'] ? $b['pts'] - $a['pts'] : $a['order'] - $b['order']);
        $tip = $tips[0]['tip'] ?? 'Your resume looks great!';

        return ['score' => $points, 'tip' => $tip];
    }
}
