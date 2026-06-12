<?php

namespace App\Data;

class SkillCategories
{
    /**
     * Profession-agnostic grouping buckets → member DB categories (from job_skills).
     * Every one of the 27 seeded categories appears in exactly one bucket.
     *
     * @var array<string, list<string>>
     */
    public const BUCKETS = [
        'Programming & Languages' => ['Programming Languages'],
        'Web & Mobile' => ['Web Frontend', 'Web Backend', 'Mobile Development'],
        'Data & AI' => ['Data Science & Analytics', 'AI & Generative AI', 'Databases'],
        'Cloud, DevOps & Security' => ['DevOps & Cloud', 'Cybersecurity'],
        'Design & UX' => ['UX & Design'],
        'Tools & Productivity' => ['Tools & Productivity'],
        'Marketing & Sales' => ['Marketing', 'Sales'],
        'Finance' => ['Finance & Accounting', 'FinTech & Quantitative Finance'],
        'Operations, PM & HR' => ['Operations & Supply Chain', 'Project & Product Management', 'Human Resources'],
        'Healthcare, Science & Engineering' => ['Healthcare & Clinical', 'Science & Research', 'Engineering', 'Architecture & Construction'],
        'Education, Legal & Writing' => ['Education & Training', 'Legal', 'Writing & Communications', 'Customer Service & Support'],
        'Soft Skills' => ['Soft Skills'],
    ];

    /**
     * @return list<string>
     */
    public static function labels(): array
    {
        return array_keys(self::BUCKETS);
    }

    /**
     * @return array<int, array{label: string, categories: list<string>}>
     */
    public static function buckets(): array
    {
        $out = [];
        foreach (self::BUCKETS as $label => $categories) {
            $out[] = ['label' => $label, 'categories' => $categories];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public static function categoriesFor(string $label): array
    {
        return self::BUCKETS[$label] ?? [];
    }
}
