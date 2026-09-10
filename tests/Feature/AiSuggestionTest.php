<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class AiSuggestionTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    private function subscribedUserWithCredits(int $credits = 20, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, $credits, 'admin');

        return $user;
    }

    public function test_guests_cannot_rewrite_bullets(): void
    {
        $this->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertUnauthorized();
    }

    public function test_a_bullet_is_rewritten_and_logged(): void
    {
        $user = $this->subscribedUserWithCredits();

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
        $user = $this->subscribedUserWithCredits(20);

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
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create([
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
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertNotFound();
    }

    public function test_blocked_users_cannot_review(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertStatus(429);
    }

    public function test_a_section_is_rewritten_and_logged(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create(['summary' => 'Did stuff at companies.']);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => ['role' => 'assistant', 'content' => 'Backend engineer with AWS experience.'],
                    ],
                ],
                'usage' => ['prompt_tokens' => 60, 'completion_tokens' => 15],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'summary',
                'text' => 'Did stuff at companies.',
                'detail' => 'Mention AWS explicitly since the target JD asks for it.',
            ]);

        $response->assertOk()->assertJson(['text' => 'Backend engineer with AWS experience.']);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'section_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 60,
            'completion_tokens' => 15,
        ]);
    }

    public function test_only_summary_section_can_be_rewritten(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'experience',
                'text' => 'Did stuff.',
                'detail' => 'Add metrics.',
            ])
            ->assertInvalid(['section']);
    }

    public function test_rewriting_a_section_on_another_users_resume_is_not_found(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'summary',
                'text' => 'Did stuff.',
                'detail' => 'Add metrics.',
            ])
            ->assertNotFound();
    }

    public function test_blocked_users_cannot_rewrite_sections(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'summary',
                'text' => 'Did stuff.',
                'detail' => 'Add metrics.',
            ])
            ->assertStatus(429);
    }
}
