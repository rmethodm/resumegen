<?php

namespace Tests\Feature;

use App\Data\SkillCategories;
use PHPUnit\Framework\TestCase;

class SkillCategoriesTest extends TestCase
{
    /**
     * The canonical 27 categories seeded into job_skills.
     *
     * @return list<string>
     */
    private function canonicalCategories(): array
    {
        return [
            'AI & Generative AI', 'Architecture & Construction', 'Customer Service & Support',
            'Cybersecurity', 'Data Science & Analytics', 'Databases', 'DevOps & Cloud',
            'Education & Training', 'Engineering', 'Finance & Accounting',
            'FinTech & Quantitative Finance', 'Healthcare & Clinical', 'Human Resources',
            'Legal', 'Marketing', 'Mobile Development', 'Operations & Supply Chain',
            'Programming Languages', 'Project & Product Management', 'Sales',
            'Science & Research', 'Soft Skills', 'Tools & Productivity', 'UX & Design',
            'Web Backend', 'Web Frontend', 'Writing & Communications',
        ];
    }

    public function test_there_are_twelve_buckets(): void
    {
        $this->assertCount(12, SkillCategories::labels());
    }

    public function test_every_db_category_appears_in_exactly_one_bucket(): void
    {
        $all = [];
        foreach (SkillCategories::buckets() as $bucket) {
            foreach ($bucket['categories'] as $cat) {
                $all[] = $cat;
            }
        }

        sort($all);
        $expected = $this->canonicalCategories();
        sort($expected);

        // No duplicates across buckets, and every canonical category is covered exactly once.
        $this->assertSame($expected, $all);
    }

    public function test_categories_for_returns_members_or_empty(): void
    {
        $this->assertSame(['Web Frontend', 'Web Backend', 'Mobile Development'], SkillCategories::categoriesFor('Web & Mobile'));
        $this->assertSame([], SkillCategories::categoriesFor('Nonexistent Bucket'));
    }
}
