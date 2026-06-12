<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Services\ResumeStrengthScorer;
use PHPUnit\Framework\TestCase;

class ResumeStrengthScorerTest extends TestCase
{
    private function makeResume(array $attrs = []): Resume
    {
        $resume = new Resume;
        $resume->setRawAttributes(array_merge([
            'contact' => json_encode([]),
            'summary' => null,
            'experience' => json_encode([]),
            'education' => json_encode([]),
            'skills' => json_encode([]),
            'skills_groups' => json_encode([]),
            'skill_narratives' => json_encode([]),
            'certifications' => json_encode([]),
            'custom_sections' => json_encode([]),
        ], $attrs));

        return $resume;
    }

    public function test_empty_resume_scores_zero(): void
    {
        $resume = $this->makeResume();
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(0, $result['score']);
    }

    public function test_complete_contact_adds_15_points(): void
    {
        $resume = $this->makeResume([
            'contact' => json_encode(['full_name' => 'Alex Johnson', 'email' => 'a@b.com', 'location' => 'SF']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_summary_adds_15_points(): void
    {
        $resume = $this->makeResume(['summary' => 'Senior engineer with 5 years experience.']);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_one_experience_adds_15_points(): void
    {
        $resume = $this->makeResume([
            'experience' => json_encode([['id' => '1', 'company' => 'Acme', 'bullets' => '']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_two_experiences_adds_25_points(): void
    {
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => ''],
                ['id' => '2', 'company' => 'Beta', 'bullets' => ''],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(25, $result['score']); // 15 (>=1) + 10 (>=2)
    }

    public function test_education_adds_10_points(): void
    {
        $resume = $this->makeResume([
            'education' => json_encode([['id' => '1', 'school' => 'MIT']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_three_skills_adds_10_points(): void
    {
        $resume = $this->makeResume([
            'skills' => json_encode(['PHP', 'React', 'SQL']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_fewer_than_three_skills_adds_zero(): void
    {
        $resume = $this->makeResume([
            'skills' => json_encode(['PHP', 'React']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(0, $result['score']);
    }

    public function test_grouped_skills_count_toward_skill_score(): void
    {
        $resume = $this->makeResume([
            'skills_groups' => json_encode([
                ['category' => 'Languages', 'items' => ['PHP', 'Python', 'JavaScript']],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_narrative_skills_count_toward_skill_score(): void
    {
        $resume = $this->makeResume([
            'skill_narratives' => json_encode([
                ['name' => 'Backend', 'bullets' => ['PHP', 'Laravel', 'MySQL']],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_skills_counted_across_all_layout_formats(): void
    {
        $resume = $this->makeResume([
            'skills' => json_encode(['PHP']),
            'skills_groups' => json_encode([
                ['category' => 'Frontend', 'items' => ['React']],
            ]),
            'skill_narratives' => json_encode([
                ['name' => 'DevOps', 'bullets' => ['Docker']],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_bullet_with_number_adds_10_points(): void
    {
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => "Reduced latency by 40%\nImproved test coverage"],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(25, $result['score']); // 15 (>=1 exp) + 10 (metric bullet)
    }

    public function test_linkedin_url_adds_5_points(): void
    {
        $resume = $this->makeResume([
            'contact' => json_encode([
                'full_name' => 'Alex', 'email' => 'a@b.com', 'location' => 'SF',
                'linkedin' => 'https://linkedin.com/in/alex',
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(20, $result['score']); // 15 (complete contact) + 5 (linkedin)
    }

    public function test_experience_with_3_bullets_adds_5_bonus_points(): void
    {
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'bullets' => "Bullet A\nBullet B\nBullet C"],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(20, $result['score']); // 15 (>=1 exp) + 5 (3+ bullets)
    }

    public function test_custom_section_adds_5_points(): void
    {
        $resume = $this->makeResume([
            'custom_sections' => json_encode([['id' => '1', 'name' => 'Publications', 'entries' => []]]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(5, $result['score']);
    }

    public function test_tip_is_highest_point_unmet_criterion(): void
    {
        $resume = $this->makeResume([
            'contact' => json_encode(['name' => 'Alex', 'email' => 'a@b.com', 'location' => 'SF']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertStringContainsString('summary', strtolower($result['tip']));
    }

    public function test_perfect_resume_scores_100(): void
    {
        $resume = $this->makeResume([
            'contact' => json_encode([
                'full_name' => 'Alex Johnson', 'email' => 'a@b.com', 'location' => 'SF',
                'linkedin' => 'https://linkedin.com/in/alex',
            ]),
            'summary' => 'Senior engineer.',
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => "Led 5-person team\nCut costs 30%\nBuilt 10 features"],
                ['id' => '2', 'company' => 'Beta', 'bullets' => 'Shipped v2 in 60 days'],
            ]),
            'education' => json_encode([['id' => '1', 'school' => 'MIT']]),
            'skills' => json_encode(['PHP', 'React', 'SQL']),
            'certifications' => json_encode([['id' => '1', 'name' => 'AWS']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(100, $result['score']);
    }
}
