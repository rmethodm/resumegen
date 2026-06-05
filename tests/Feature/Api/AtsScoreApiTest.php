<?php

namespace Tests\Feature\Api;

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

    public function test_api_ats_score_returns_402_for_free_user(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $user->createToken('test')->plainTextToken;

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
