<?php

namespace App\Services;

use App\Models\Resume;

class ResumeStrengthScorer
{
    public static function score(Resume $resume): array
    {
        $points = 0;
        $tips = [];
        $checklist = [];
        $order = 0;

        $contact = $resume->contact ?? [];
        $experience = $resume->experience ?? [];
        $education = $resume->education ?? [];
        $skills = $resume->skills ?? [];
        $certifications = $resume->certifications ?? [];
        $customSections = $resume->custom_sections ?? [];

        // Professional summary — 15pts
        $hasSummary = ! empty($resume->summary);
        $points += $hasSummary ? 15 : 0;
        $checklist[] = ['label' => 'Professional summary', 'pts' => 15, 'passed' => $hasSummary];
        if (! $hasSummary) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add a professional summary'];
        }

        // Contact info complete — 15pts
        $hasContact = ! empty($contact['full_name']) && ! empty($contact['email']) && ! empty($contact['location']);
        $points += $hasContact ? 15 : 0;
        $checklist[] = ['label' => 'Contact info complete', 'pts' => 15, 'passed' => $hasContact];
        if (! $hasContact) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Complete your contact information'];
        }

        // At least 1 experience — 15pts
        $hasExp = count($experience) >= 1;
        $points += $hasExp ? 15 : 0;
        $checklist[] = ['label' => 'At least one work experience', 'pts' => 15, 'passed' => $hasExp];
        if (! $hasExp) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add at least one work experience'];
        }

        // Education — 10pts
        $hasEdu = count($education) >= 1;
        $points += $hasEdu ? 10 : 0;
        $checklist[] = ['label' => 'Education', 'pts' => 10, 'passed' => $hasEdu];
        if (! $hasEdu) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add your education'];
        }

        // At least 3 skills — 10pts (count across all layout formats)
        $skillCount = count($skills);
        foreach ($resume->skills_groups ?? [] as $group) {
            $skillCount += count($group['items'] ?? []);
        }
        foreach ($resume->skill_narratives ?? [] as $narrative) {
            $skillCount += count(array_filter($narrative['bullets'] ?? []));
        }
        $hasSkills = $skillCount >= 3;
        $points += $hasSkills ? 10 : 0;
        $checklist[] = ['label' => '3+ skills listed', 'pts' => 10, 'passed' => $hasSkills];
        if (! $hasSkills) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add at least 3 skills'];
        }

        // Bullet with number or metric — 10pts
        $allBullets = collect($experience)
            ->flatMap(fn ($e) => array_filter(explode("\n", $e['bullets'] ?? '')))
            ->all();
        $hasMetric = collect($allBullets)->contains(fn ($b) => (bool) preg_match('/\d/', $b));
        $points += $hasMetric ? 10 : 0;
        $checklist[] = ['label' => 'Quantified bullet (number/metric)', 'pts' => 10, 'passed' => $hasMetric];
        if (! $hasMetric) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add numbers or metrics to your bullets'];
        }

        // At least 2 experiences — 10pts
        $hasMultiExp = count($experience) >= 2;
        $points += $hasMultiExp ? 10 : 0;
        $checklist[] = ['label' => 'Two or more work experiences', 'pts' => 10, 'passed' => $hasMultiExp];
        if (! $hasMultiExp) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add a second work experience'];
        }

        // LinkedIn URL — 5pts
        $hasLinkedIn = ! empty($contact['linkedin']);
        $points += $hasLinkedIn ? 5 : 0;
        $checklist[] = ['label' => 'LinkedIn URL', 'pts' => 5, 'passed' => $hasLinkedIn];
        if (! $hasLinkedIn) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add your LinkedIn URL'];
        }

        // At least one experience with 3+ bullets — 5pts
        $hasRichBullets = collect($experience)
            ->contains(fn ($e) => count(array_filter(explode("\n", $e['bullets'] ?? ''))) >= 3);
        $points += $hasRichBullets ? 5 : 0;
        $checklist[] = ['label' => '3+ bullets on one experience', 'pts' => 5, 'passed' => $hasRichBullets];
        if (! $hasRichBullets) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add 3+ bullets to a work experience entry'];
        }

        // Custom section or certification — 5pts
        $hasExtra = count($certifications) >= 1 || count($customSections) >= 1;
        $points += $hasExtra ? 5 : 0;
        $checklist[] = ['label' => 'Certification or custom section', 'pts' => 5, 'passed' => $hasExtra];
        if (! $hasExtra) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add a certification or custom section'];
        }

        usort($tips, fn ($a, $b) => $b['pts'] !== $a['pts'] ? $b['pts'] - $a['pts'] : $a['order'] - $b['order']);
        $tip = $tips[0]['tip'] ?? 'Your resume looks great!';

        return ['score' => $points, 'tip' => $tip, 'checklist' => $checklist];
    }
}
