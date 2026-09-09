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
}
