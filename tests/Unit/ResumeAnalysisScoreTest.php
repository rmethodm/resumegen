<?php

namespace Tests\Unit;

use App\Models\Experience;
use App\Models\Resume;
use App\Models\Skill;
use App\Support\ResumeAnalysis;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pins the four score bands so the TypeScript live scorer can stay in parity.
 */
class ResumeAnalysisScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_emptyish_resume_has_neutral_keywords_and_zero_other_bands(): void
    {
        $resume = Resume::factory()->create([
            'full_name' => '',
            'headline' => '',
            'email' => '',
            'location' => '',
            'summary' => '',
            'target_role' => '',
        ]);
        $resume->load(['experiences', 'skills']);

        $breakdown = ResumeAnalysis::breakdown($resume);

        $this->assertSame('Profile', $breakdown[0]['label']);
        $this->assertSame(0, $breakdown[0]['score']);
        $this->assertSame(0, $breakdown[1]['score']);
        $this->assertSame(0, $breakdown[2]['score']);
        // No role family → neutral 0.6 × 25
        $this->assertSame(15, $breakdown[3]['score']);
        $this->assertSame(15, ResumeAnalysis::score($resume));
    }

    public function test_full_profile_scores_twenty_five(): void
    {
        $resume = Resume::factory()->create([
            'full_name' => 'Jane Doe',
            'headline' => 'Engineer',
            'email' => 'jane@example.com',
            'location' => 'Austin, TX',
            'summary' => str_repeat('A', 80),
            'target_role' => '',
        ]);
        $resume->load(['experiences', 'skills']);

        $profile = collect(ResumeAnalysis::breakdown($resume))
            ->firstWhere('label', 'Profile');

        $this->assertSame(25, $profile['score']);
    }

    public function test_two_roles_and_six_bullets_max_experience_band(): void
    {
        $resume = Resume::factory()->create([
            'summary' => str_repeat('A', 80),
            'target_role' => '',
        ]);

        Experience::factory()->for($resume)->create([
            'title' => 'Engineer',
            'company' => 'Acme',
            'bullets' => ['Built APIs', 'Shipped features', 'Fixed bugs'],
        ]);
        Experience::factory()->for($resume)->create([
            'title' => 'Intern',
            'company' => 'Beta',
            'bullets' => ['Wrote tests', 'Led reviews', 'Mentored juniors'],
        ]);

        $resume->load(['experiences', 'skills']);

        $experience = collect(ResumeAnalysis::breakdown($resume))
            ->firstWhere('label', 'Experience');

        $this->assertSame(25, $experience['score']);
    }

    public function test_impact_band_is_share_of_quantified_bullets(): void
    {
        $resume = Resume::factory()->create([
            'summary' => str_repeat('A', 80),
            'target_role' => '',
        ]);

        Experience::factory()->for($resume)->create([
            'title' => 'Engineer',
            'company' => 'Acme',
            'bullets' => [
                'Cut latency by 40%',
                'Improved reliability',
            ],
        ]);

        $resume->load(['experiences', 'skills']);

        $impact = collect(ResumeAnalysis::breakdown($resume))
            ->firstWhere('label', 'Impact');

        // 1/2 × 25 = 12.5 → round 13
        $this->assertSame(13, $impact['score']);
    }

    public function test_responsible_for_suggestion_includes_safe_rewrite(): void
    {
        $resume = Resume::factory()->create([
            'summary' => str_repeat('Experienced professional. ', 4),
            'target_role' => '',
        ]);

        Experience::factory()->for($resume)->create([
            'title' => 'Ops',
            'company' => 'Acme',
            'bullets' => ['Responsible for ServiceNow ticket queues daily.'],
        ]);

        $resume->load(['experiences', 'skills']);

        $suggestion = collect(ResumeAnalysis::suggestions($resume))
            ->first(fn (array $item): bool => $item['experience'] === 0 && $item['bullet'] === 0);

        $this->assertNotNull($suggestion);
        $this->assertSame(
            'Managed ServiceNow ticket queues daily.',
            $suggestion['rewrite'],
        );
    }

    public function test_missing_keywords_appear_for_engineer_role(): void
    {
        $resume = Resume::factory()->create([
            'full_name' => 'Jane',
            'headline' => 'Dev',
            'email' => 'a@b.com',
            'location' => 'X',
            'summary' => str_repeat('A', 80),
            'target_role' => 'Software Engineer',
        ]);

        foreach (['Go', 'Docker', 'Kubernetes', 'AWS', 'Linux'] as $name) {
            Skill::factory()->for($resume)->create(['name' => $name, 'category' => '']);
        }

        $resume->load(['experiences', 'skills']);

        $tip = collect(ResumeAnalysis::suggestions($resume))
            ->first(fn (array $item): bool => str_starts_with($item['message'], 'Missing for this role:'));

        $this->assertNotNull($tip);
        $this->assertStringContainsString('typescript', strtolower($tip['message']));
    }
}
