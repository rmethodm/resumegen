<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeStrengthSnapshot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StrengthScorePanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_returns_score_and_checklist(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'summary' => 'Experienced engineer.',
            'contact' => ['full_name' => 'Jane', 'email' => 'j@e.com', 'location' => 'NYC', 'phone' => '', 'linkedin' => '', 'website' => ''],
        ]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'score',
            'tip',
            'tipKey',
            'checklist' => [['label', 'pts', 'passed']],
        ]);
    }

    public function test_top_tip_is_the_highest_value_gap(): void
    {
        $user = User::factory()->create();
        // Empty resume: the missing summary (15pts) should be the top tip.
        $resume = Resume::factory()->create(['user_id' => $user->id, 'summary' => null]);

        $this->actingAs($user)->get(route('builder.strength-score', $resume))
            ->assertJson(['tipKey' => 'summary']);
    }

    public function test_snapshot_saved_on_first_call(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->assertDatabaseCount('resume_strength_snapshots', 0);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 1);
    }

    public function test_snapshot_not_saved_when_score_unchanged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));
        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 1);
    }

    public function test_snapshot_saved_when_score_changes_by_5_or_more(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeStrengthSnapshot::create([
            'resume_id' => $resume->id,
            'score' => 90,
            'checklist' => [],
        ]);

        $resume->update(['summary' => 'Full professional summary here.']);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 2);
    }

    public function test_history_is_null_for_free_users(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $response->assertJsonPath('history', null);
    }

    public function test_history_returned_for_starter_users(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeStrengthSnapshot::create(['resume_id' => $resume->id, 'score' => 40, 'checklist' => []]);
        ResumeStrengthSnapshot::create(['resume_id' => $resume->id, 'score' => 60, 'checklist' => []]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertIsArray($response->json('history'));
        $this->assertGreaterThanOrEqual(2, count($response->json('history')));
    }

    public function test_cannot_score_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->get(route('builder.strength-score', $resume));

        $response->assertStatus(403);
    }
}
