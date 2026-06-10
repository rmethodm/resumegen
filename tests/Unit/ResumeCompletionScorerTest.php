<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Services\ResumeCompletionScorer;
use PHPUnit\Framework\TestCase;

class ResumeCompletionScorerTest extends TestCase
{
    public function test_empty_resume_scores_zero(): void
    {
        $resume = new Resume;
        $this->assertSame(0, ResumeCompletionScorer::score($resume));
    }

    public function test_full_contact_section_adds_expected_points(): void
    {
        $resume = new Resume([
            'contact' => [
                'full_name' => 'Jane Doe',
                'email' => 'jane@example.com',
                'phone' => '555-1234',
                'location' => 'NYC',
                'title' => 'Engineer',
            ],
        ]);
        $score = ResumeCompletionScorer::score($resume);
        $this->assertGreaterThan(0, $score);
    }

    public function test_score_is_capped_at_100(): void
    {
        $resume = new Resume([
            'contact' => ['full_name' => 'Jane', 'email' => 'j@e.com', 'phone' => '555', 'location' => 'NYC', 'title' => 'Eng'],
            'summary' => str_repeat('word ', 20),
            'experience' => [['title' => 'Dev', 'company' => 'Co', 'bullets' => ['Did stuff']]],
            'education' => [['school' => 'MIT']],
            'skills' => ['PHP'],
            'certifications' => [['name' => 'AWS']],
        ]);
        $this->assertLessThanOrEqual(100, ResumeCompletionScorer::score($resume));
    }
}
