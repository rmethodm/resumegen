<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AtsScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_requires_auth(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $this->getJson(route('builder.ats-score', $resume->id))->assertUnauthorized();
    }

    public function test_owner_can_fetch_score(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'r',
            'pdf_filename' => 'r.pdf',
            'summary' => 'Senior engineer who led teams and shipped scalable systems.',
            'experience' => [[
                'id' => '1', 'company' => 'X', 'title' => 'Engineer',
                'start_date' => '2020', 'end_date' => '2024', 'current' => false,
                'bullets' => "- Built and deployed React apps\n- Reduced costs by 30%",
            ]],
            'skills' => ['PHP', 'Laravel', 'React', 'TypeScript', 'AWS'],
        ]);

        $response = $this->actingAs($user)
            ->getJson(route('builder.ats-score', $resume->id));

        $response->assertOk()
            ->assertJsonStructure(['score', 'found', 'missing', 'breakdown' => ['action_verbs', 'technical', 'soft_skills', 'format_signals']]);

        $this->assertIsInt($response->json('score'));
        $this->assertGreaterThan(0, $response->json('score'));
        $this->assertLessThanOrEqual(100, $response->json('score'));
    }

    public function test_non_owner_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $this->actingAs($other)
            ->getJson(route('builder.ats-score', $resume->id))
            ->assertForbidden();
    }

    public function test_empty_resume_scores_low(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $score = $this->actingAs($user)
            ->getJson(route('builder.ats-score', $resume->id))
            ->json('score');

        $this->assertLessThan(20, $score);
    }

    public function test_ats_cache_columns_exist(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $resume->update(['ats_cache' => ['score' => 77], 'ats_cached_at' => now()]);

        $fresh = $resume->fresh();
        $this->assertEquals(77, $fresh->ats_cache['score']);
        $this->assertNotNull($fresh->ats_cached_at);
    }
}
