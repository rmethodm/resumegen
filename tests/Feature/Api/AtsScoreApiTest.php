<?php

namespace Tests\Feature\Api;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AtsScoreApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_can_fetch_ats_score_for_own_resume(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create([
            'name' => 'CV', 'pdf_filename' => 'cv.pdf',
            'summary' => 'Experienced engineer.',
            'skills' => ['PHP', 'Laravel'],
            'experience' => [['title' => 'Dev', 'company' => 'Acme', 'bullets' => ['Built things']]],
        ]);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/resumes/{$resume->id}/ats-score")
            ->assertOk()
            ->assertJsonStructure(['score', 'breakdown']);
    }

    public function test_api_ats_score_returns_402_for_free_user_at_monthly_limit(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $user->createToken('test')->plainTextToken;

        for ($i = 0; $i < 3; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ats_score',
                'input_tokens' => 0, 'output_tokens' => 0, 'cost_usd' => 0.0,
            ]);
        }

        $this->withToken($token)
            ->getJson("/api/resumes/{$resume->id}/ats-score")
            ->assertStatus(402)
            ->assertJsonPath('required_tier', 'starter');
    }

    public function test_cannot_fetch_ats_score_for_other_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $other->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/resumes/{$resume->id}/ats-score")
            ->assertForbidden();
    }
}
