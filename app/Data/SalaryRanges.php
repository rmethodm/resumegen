<?php

namespace App\Data;

class SalaryRanges
{
    /** @return array<string, array{min: int, max: int, median: int}> */
    public static function all(): array
    {
        return [
            'software engineer' => ['min' => 95000,  'max' => 160000, 'median' => 125000],
            'senior software engineer' => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'staff software engineer' => ['min' => 165000, 'max' => 280000, 'median' => 210000],
            'principal engineer' => ['min' => 180000, 'max' => 320000, 'median' => 240000],
            'engineering manager' => ['min' => 150000, 'max' => 260000, 'median' => 195000],
            'frontend engineer' => ['min' => 90000,  'max' => 155000, 'median' => 120000],
            'backend engineer' => ['min' => 90000,  'max' => 160000, 'median' => 122000],
            'fullstack engineer' => ['min' => 90000,  'max' => 155000, 'median' => 118000],
            'devops engineer' => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'site reliability engineer' => ['min' => 110000, 'max' => 190000, 'median' => 145000],
            'data engineer' => ['min' => 100000, 'max' => 165000, 'median' => 130000],
            'data scientist' => ['min' => 95000,  'max' => 160000, 'median' => 125000],
            'machine learning engineer' => ['min' => 120000, 'max' => 210000, 'median' => 160000],
            'ai engineer' => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'product manager' => ['min' => 100000, 'max' => 175000, 'median' => 135000],
            'senior product manager' => ['min' => 130000, 'max' => 220000, 'median' => 165000],
            'director of product' => ['min' => 160000, 'max' => 280000, 'median' => 210000],
            'product designer' => ['min' => 85000,  'max' => 145000, 'median' => 112000],
            'ux designer' => ['min' => 80000,  'max' => 140000, 'median' => 107000],
            'ui designer' => ['min' => 75000,  'max' => 130000, 'median' => 100000],
            'ux researcher' => ['min' => 85000,  'max' => 145000, 'median' => 110000],
            'design lead' => ['min' => 120000, 'max' => 190000, 'median' => 150000],
            'marketing manager' => ['min' => 70000,  'max' => 120000, 'median' => 90000],
            'content marketing manager' => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'growth marketer' => ['min' => 75000,  'max' => 130000, 'median' => 97000],
            'seo specialist' => ['min' => 55000,  'max' => 95000,  'median' => 72000],
            'social media manager' => ['min' => 50000,  'max' => 85000,  'median' => 64000],
            'sales engineer' => ['min' => 90000,  'max' => 160000, 'median' => 122000],
            'account executive' => ['min' => 65000,  'max' => 130000, 'median' => 92000],
            'solutions architect' => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'customer success manager' => ['min' => 70000,  'max' => 120000, 'median' => 90000],
            'data analyst' => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'business analyst' => ['min' => 70000,  'max' => 115000, 'median' => 88000],
            'financial analyst' => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'finance manager' => ['min' => 90000,  'max' => 150000, 'median' => 115000],
            'hr manager' => ['min' => 70000,  'max' => 120000, 'median' => 88000],
            'recruiter' => ['min' => 55000,  'max' => 95000,  'median' => 72000],
            'technical recruiter' => ['min' => 70000,  'max' => 120000, 'median' => 88000],
            'project manager' => ['min' => 80000,  'max' => 135000, 'median' => 103000],
            'program manager' => ['min' => 90000,  'max' => 155000, 'median' => 118000],
            'scrum master' => ['min' => 85000,  'max' => 140000, 'median' => 108000],
            'qa engineer' => ['min' => 75000,  'max' => 125000, 'median' => 97000],
            'security engineer' => ['min' => 110000, 'max' => 185000, 'median' => 145000],
            'cloud engineer' => ['min' => 105000, 'max' => 175000, 'median' => 135000],
            'mobile engineer' => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'ios engineer' => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'android engineer' => ['min' => 90000,  'max' => 158000, 'median' => 122000],
            'content writer' => ['min' => 50000,  'max' => 85000,  'median' => 63000],
            'technical writer' => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'operations manager' => ['min' => 75000,  'max' => 130000, 'median' => 95000],
            'chief of staff' => ['min' => 100000, 'max' => 180000, 'median' => 135000],
        ];
    }

    /**
     * @return array{min: int|null, max: int|null, median: int|null, match: string}
     */
    public static function lookup(string $role): array
    {
        $normalised = strtolower(trim($role));
        $data = self::all();

        if (isset($data[$normalised])) {
            return [...$data[$normalised], 'match' => 'exact'];
        }

        $best = null;
        $bestScore = 0;
        foreach ($data as $key => $range) {
            $score = 0;
            if (str_contains($normalised, $key)) {
                $score = strlen($key);
            } elseif (str_contains($key, $normalised)) {
                $score = strlen($normalised);
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $range;
            }
        }

        if ($best !== null && $bestScore >= 5) {
            return [...$best, 'match' => 'partial'];
        }

        return ['min' => null, 'max' => null, 'median' => null, 'match' => 'none'];
    }
}
