<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NegotiationScriptTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_user_gets_negotiation_script(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Dear Hiring Manager, I am excited about the offer...']],
            ], 200),
        ]);

        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create([
            'user_id' => $user->id,
            'role' => 'Software Engineer',
            'status' => 'offer',
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), [
                'offered_salary' => '$120,000',
                'target_salary' => '$135,000',
            ]);

        $response->assertOk()->assertJsonStructure(['email_body']);
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->free()->create();
        $job = JobApplication::factory()->create(['user_id' => $user->id, 'role' => 'Engineer', 'status' => 'offer']);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), []);

        $response->assertStatus(402)->assertJsonPath('required_tier', 'starter');
    }

    public function test_non_owner_gets_403(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $job = JobApplication::factory()->create(['user_id' => $owner->id, 'role' => 'Engineer', 'status' => 'offer']);

        $this->actingAs($other)
            ->postJson(route('jobs.negotiation-script', $job->id), [])
            ->assertForbidden();
    }

    public function test_missing_role_returns_422(): void
    {
        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create(['user_id' => $user->id, 'role' => '', 'status' => 'offer']);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), []);

        $response->assertUnprocessable();
    }

    public function test_script_logged_to_ai_usage_logs(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Dear Hiring Manager...']],
                'usage' => ['input_tokens' => 200, 'output_tokens' => 150],
                'model' => 'claude-3-5-haiku-20241022',
            ], 200),
        ]);

        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create([
            'user_id' => $user->id,
            'role' => 'Software Engineer',
            'status' => 'offer',
        ]);

        $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), [
                'offered_salary' => '$100,000',
                'target_salary' => '$115,000',
            ]);

        $this->assertDatabaseHas('ai_usage_logs', [
            'user_id' => $user->id,
            'feature' => 'negotiation',
        ]);
    }
}
