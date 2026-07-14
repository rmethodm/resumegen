<?php

namespace Tests\Feature;

use App\Models\Resume;
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

    public function test_cannot_score_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->get(route('builder.strength-score', $resume));

        $response->assertStatus(403);
    }
}
