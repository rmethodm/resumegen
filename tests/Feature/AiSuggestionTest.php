<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use RuntimeException;
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

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function generateGapPayload(array $overrides = []): array
    {
        return [
            'keyword' => 'AWS',
            'job_description' => 'Need AWS experience.',
            ...$overrides,
        ];
    }

    /**
     * @param  list<string>  $options
     */
    private function fakeRewriteOptions(array $options = ['A', 'B', 'C'], int $promptTokens = 40, int $completionTokens = 12): CreateResponse
    {
        return CreateResponse::fake([
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => json_encode(['options' => $options]),
                    ],
                ],
            ],
            'usage' => ['prompt_tokens' => $promptTokens, 'completion_tokens' => $completionTokens],
        ]);
    }

    public function test_guests_cannot_rewrite_bullets(): void
    {
        $this->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertUnauthorized();
    }

    public function test_unsubscribed_users_cannot_rewrite_bullets(): void
    {
        $user = User::factory()->create();
        app(AiCreditService::class)->grant($user, 5, 'admin');

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
    }

    public function test_subscribers_without_credits_cannot_rewrite_bullets(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(0, app(AiCreditService::class)->balance($user));
    }

    public function test_a_bullet_is_rewritten_and_logged(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([$this->fakeRewriteOptions(['Led backend migration.', 'Cut API latency.', 'Shipped the cutover.'])]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did backend stuff']);

        $response->assertOk()->assertExactJson([
            'options' => ['Led backend migration.', 'Cut API latency.', 'Shipped the cutover.'],
            'credits_remaining' => 4,
        ]);

        $this->assertSame(4, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseHas('ai_credit_ledger', [
            'user_id' => $user->id,
            'amount' => -1,
            'reason' => 'spend',
            'feature' => 'bullet_rewrite',
        ]);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'bullet_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 40,
            'completion_tokens' => 12,
            'cost_micro_cents' => 600 + 720, // (40/1000*15000) + (12/1000*60000)
        ]);
    }

    public function test_openai_failure_does_not_debit_rewrite_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([new RuntimeException('openai unavailable')]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did backend stuff'])
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'bullet_rewrite',
        ]);
    }

    public function test_unusable_rewrite_response_does_not_debit_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'not-json']],
                ],
            ]),
        ]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did backend stuff'])
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'bullet_rewrite',
        ]);
    }

    public function test_blocked_users_are_refused(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(429)
            ->assertJson(['message' => 'AI access is blocked.']);
    }

    public function test_the_count_cap_no_longer_blocks_usage(): void
    {
        $user = $this->subscribedUserWithCredits(20);

        OpenAI::fake(array_fill(0, 12, $this->fakeRewriteOptions()));

        for ($i = 0; $i < 12; $i++) {
            $this->actingAs($user)
                ->postJson(route('ai.rewrite-bullet'), ['bullet' => "Bullet {$i}"])
                ->assertOk();
        }

        $this->assertSame(8, app(AiCreditService::class)->balance($user));
    }

    public function test_guests_cannot_rewrite_summaries(): void
    {
        $this->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertUnauthorized();
    }

    public function test_unsubscribed_users_cannot_rewrite_summaries(): void
    {
        $user = User::factory()->create();
        app(AiCreditService::class)->grant($user, 5, 'admin');

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
    }

    public function test_subscribers_without_credits_cannot_rewrite_summaries(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(0, app(AiCreditService::class)->balance($user));
    }

    public function test_a_summary_is_rewritten_and_logged(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([$this->fakeRewriteOptions(['Backend engineer with AWS experience.', 'Shipped cloud platforms at scale.', 'Built reliable services for operators.'])]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), [
                'summary' => 'Did stuff at companies.',
                'target_role' => 'Backend Engineer',
            ]);

        $response->assertOk()->assertExactJson([
            'options' => ['Backend engineer with AWS experience.', 'Shipped cloud platforms at scale.', 'Built reliable services for operators.'],
            'credits_remaining' => 4,
        ]);

        $this->assertSame(4, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseHas('ai_credit_ledger', [
            'user_id' => $user->id,
            'amount' => -1,
            'reason' => 'spend',
            'feature' => 'summary_rewrite',
        ]);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'summary_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 40,
            'completion_tokens' => 12,
            'cost_micro_cents' => 600 + 720,
        ]);
    }

    public function test_openai_failure_does_not_debit_summary_rewrite_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([new RuntimeException('openai unavailable')]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'summary_rewrite',
        ]);
    }

    public function test_unusable_summary_rewrite_response_does_not_debit_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'not-json']],
                ],
            ]),
        ]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'summary_rewrite',
        ]);
    }

    public function test_blocked_users_cannot_rewrite_summaries(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-summary'), ['summary' => 'Did stuff at companies.'])
            ->assertStatus(429)
            ->assertJson(['message' => 'AI access is blocked.']);
    }

    public function test_ai_review_route_is_unregistered(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/resumes/{$resume->id}/ai-review")
            ->assertNotFound();
    }

    public function test_ai_rewrite_section_route_is_unregistered(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/resumes/{$resume->id}/ai-rewrite-section", [
                'section' => 'summary',
                'text' => 'Did stuff.',
                'detail' => 'Add metrics.',
            ])
            ->assertNotFound();
    }

    public function test_past_due_subscribers_cannot_rewrite_bullets_even_with_credits(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user, 'past_due');
        app(AiCreditService::class)->grant($user, 10, 'admin');

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(10, app(AiCreditService::class)->balance($user));
    }

    public function test_canceled_ended_subscribers_cannot_rewrite_bullets_even_with_credits(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user, 'canceled', now()->subDay());
        app(AiCreditService::class)->grant($user, 10, 'admin');

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did stuff'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(10, app(AiCreditService::class)->balance($user));
    }

    public function test_generating_gap_bullets_on_another_users_resume_is_not_found(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($intruder)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertNotFound();
    }

    public function test_generating_gap_bullets_without_a_job_description_is_invalid(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create(['target_job_description' => 'Need AWS experience.']);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
            ->assertInvalid(['job_description']);

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
                'job_description' => '   ',
            ]))
            ->assertInvalid(['job_description']);
    }

    public function test_gap_generate_uses_request_job_description_when_resume_has_none(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create(['target_job_description' => '']);
        $experience = Experience::factory()->for($resume)->create();

        OpenAI::fake([$this->fakeRewriteOptions(['Led AWS migration.', 'Cut AWS spend.'])]);

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
                'job_description' => 'Need AWS experience now.',
            ]))
            ->assertOk()
            ->assertJson([
                'options' => ['Led AWS migration.', 'Cut AWS spend.'],
                'credits_remaining' => 4,
            ]);
    }

    public function test_experience_id_must_belong_to_the_resume(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $otherResume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $foreignExperience = Experience::factory()->for($otherResume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $foreignExperience->id,
            ]))
            ->assertInvalid(['experience_id']);
    }

    public function test_gap_bullets_can_be_generated_by_experience_index(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Looking for a senior backend engineer with AWS experience.',
        ]);
        Experience::factory()->for($resume)->create([
            'position' => 0,
            'title' => 'Backend Engineer',
            'company' => 'Acme',
        ]);
        Experience::factory()->for($resume)->create([
            'position' => 1,
            'title' => 'Older role',
        ]);

        OpenAI::fake([$this->fakeRewriteOptions(['Led AWS migration.', 'Cut AWS spend.'])]);

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_index' => 0,
                'job_description' => 'Looking for a senior backend engineer with AWS experience.',
            ]))
            ->assertOk()
            ->assertJson([
                'options' => ['Led AWS migration.', 'Cut AWS spend.'],
                'credits_remaining' => 4,
            ]);
    }

    public function test_experience_index_must_exist_on_the_resume(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_index' => 4,
            ]))
            ->assertInvalid(['experience_index']);
    }

    public function test_gap_bullets_are_generated_and_debited(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Looking for a senior backend engineer with AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create([
            'title' => 'Backend Engineer',
            'company' => 'Acme',
            'bullets' => ['Shipped the API cutover.'],
        ]);

        OpenAI::fake([$this->fakeRewriteOptions(['Led AWS migration.', 'Cut AWS spend.', 'Hardened AWS deploys.'])]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
                'job_description' => 'Looking for a senior backend engineer with AWS experience.',
            ]));

        $response->assertOk()->assertExactJson([
            'options' => ['Led AWS migration.', 'Cut AWS spend.', 'Hardened AWS deploys.'],
            'credits_remaining' => 4,
        ]);

        $this->assertSame(4, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseHas('ai_credit_ledger', [
            'user_id' => $user->id,
            'amount' => -1,
            'reason' => 'spend',
            'feature' => 'gap_generate',
        ]);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'gap_generate',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 40,
            'completion_tokens' => 12,
            'cost_micro_cents' => 600 + 720,
        ]);
    }

    public function test_openai_failure_does_not_debit_gap_generate_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        OpenAI::fake([new RuntimeException('openai unavailable')]);

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'gap_generate',
        ]);
    }

    public function test_guests_cannot_generate_gap_bullets(): void
    {
        $resume = Resume::factory()->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
            'experience_id' => $experience->id,
        ]))->assertUnauthorized();
    }

    public function test_subscribers_without_credits_cannot_generate_gap_bullets(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(0, app(AiCreditService::class)->balance($user));
    }

    public function test_unsubscribed_users_cannot_generate_gap_bullets(): void
    {
        $user = User::factory()->create();
        app(AiCreditService::class)->grant($user, 5, 'admin');
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
    }

    public function test_blocked_users_cannot_generate_gap_bullets(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertStatus(429)
            ->assertJson(['message' => 'AI access is blocked.']);
    }

    public function test_full_experience_does_not_debit_gap_generate_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create([
            'bullets' => array_fill(0, 12, 'Existing bullet.'),
        ]);

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), $this->generateGapPayload([
                'experience_id' => $experience->id,
            ]))
            ->assertInvalid(['experience_id']);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'gap_generate',
        ]);
    }
}
