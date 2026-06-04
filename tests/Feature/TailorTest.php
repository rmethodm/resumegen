<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TailorTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_tailor_resume(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode([
                    'summary' => 'Tailored summary',
                    'keywords' => ['Python', 'AWS'],
                    'score' => 78,
                ])]],
                'usage' => ['input_tokens' => 100, 'output_tokens' => 50],
                'model' => 'claude-opus-4-8',
            ], 200),
        ]);

        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.tailor', $resume), [
            'job_description' => 'We are looking for a Senior Software Engineer with Python and AWS experience.',
        ]);

        $response->assertOk()->assertJsonStructure(['summary', 'keywords', 'score']);
    }

    public function test_tailor_requires_job_description(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('builder.tailor', $resume), [])
            ->assertUnprocessable();
    }

    public function test_other_user_cannot_tailor_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)->postJson(route('builder.tailor', $resume), [
            'job_description' => 'Test job description.',
        ])->assertForbidden();
    }
}
