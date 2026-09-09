<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class AiSuggestionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_rewrite_bullets(): void
    {
        $this->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertUnauthorized();
    }

    public function test_a_bullet_is_rewritten_and_logged(): void
    {
        $user = User::factory()->create();

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => ['role' => 'assistant', 'content' => 'Led backend migration reducing latency 30%.'],
                    ],
                ],
                'usage' => ['prompt_tokens' => 40, 'completion_tokens' => 12],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did backend stuff']);

        $response->assertOk()->assertJson(['text' => 'Led backend migration reducing latency 30%.']);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'bullet_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 40,
            'completion_tokens' => 12,
            'cost_micro_cents' => 600 + 720, // (40/1000*15000) + (12/1000*60000)
        ]);
    }

    public function test_blocked_users_are_refused(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(429);
    }

    public function test_the_count_cap_no_longer_blocks_usage(): void
    {
        $user = User::factory()->create();

        OpenAI::fake(array_fill(0, 12, CreateResponse::fake([
            'choices' => [
                ['message' => ['role' => 'assistant', 'content' => 'Rewritten.']],
            ],
        ])));

        for ($i = 0; $i < 12; $i++) {
            $this->actingAs($user)
                ->postJson(route('ai.rewrite-bullet'), ['bullet' => "Bullet {$i}"])
                ->assertOk();
        }
    }

    public function test_a_resume_is_reviewed_and_cached(): void
    {
        $user = User::factory()->create();
        $resume = \App\Models\Resume::factory()->for($user)->create([
            'target_job_description' => 'Looking for a senior backend engineer with AWS experience.',
        ]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'role' => 'assistant',
                            'content' => json_encode([
                                'suggestions' => [
                                    [
                                        'id' => 'summary-vague',
                                        'label' => 'Summary is too generic',
                                        'severity' => 'high',
                                        'section' => 'summary',
                                        'detail' => 'Mention AWS explicitly since the target JD asks for it.',
                                    ],
                                ],
                            ]),
                        ],
                    ],
                ],
                'usage' => ['prompt_tokens' => 500, 'completion_tokens' => 80],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume));

        $response->assertOk()
            ->assertJsonPath('suggestions.0.id', 'summary-vague')
            ->assertJsonPath('suggestions.0.severity', 'high');

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'resume_review',
            'model' => 'gpt-4o',
        ]);

        $row = \DB::table('ai_requests')->where('feature', 'resume_review')->first();
        $this->assertGreaterThan(0, $row->cost_micro_cents);

        $resume->refresh();
        $this->assertNotNull($resume->ai_review);
        $this->assertSame('summary-vague', $resume->ai_review[0]['id']);
        $this->assertNotNull($resume->ai_review_generated_at);
    }

    public function test_reviewing_another_users_resume_is_not_found(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = \App\Models\Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertNotFound();
    }

    public function test_blocked_users_cannot_review(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = \App\Models\Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertStatus(429);
    }
}
