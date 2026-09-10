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

    public function test_unsubscribed_users_cannot_review(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertStatus(402);
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
        $user = $this->subscribedUserWithCredits(5);
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

        $this->assertSame(4, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseHas('ai_credit_ledger', [
            'user_id' => $user->id,
            'amount' => -1,
            'reason' => 'spend',
            'feature' => 'summary_rewrite',
        ]);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'section_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 60,
            'completion_tokens' => 15,
        ]);
    }

    public function test_openai_failure_does_not_debit_section_rewrite_credits(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create(['summary' => 'Did stuff at companies.']);

        OpenAI::fake([new RuntimeException('openai unavailable')]);

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'summary',
                'text' => 'Did stuff at companies.',
                'detail' => 'Mention AWS explicitly since the target JD asks for it.',
            ])
            ->assertStatus(500);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseMissing('ai_credit_ledger', [
            'user_id' => $user->id,
            'reason' => 'spend',
        ]);
        $this->assertDatabaseMissing('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'section_rewrite',
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

    public function test_unsubscribed_users_cannot_rewrite_sections(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('ai.rewrite-section', $resume), [
                'section' => 'summary',
                'text' => 'Did stuff.',
                'detail' => 'Add metrics.',
            ])
            ->assertStatus(402);
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

    public function test_generating_gap_bullets_on_another_users_resume_is_not_found(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($intruder)
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
            ->assertNotFound();
    }

    public function test_generating_gap_bullets_without_a_job_description_is_invalid(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create(['target_job_description' => '']);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
            ->assertInvalid(['target_job_description']);
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $foreignExperience->id,
            ])
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_index' => 0,
            ])
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_index' => 4,
            ])
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ]);

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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
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

    public function test_subscribers_without_credits_cannot_generate_gap_bullets(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        $resume = Resume::factory()->for($user)->create([
            'target_job_description' => 'Need AWS experience.',
        ]);
        $experience = Experience::factory()->for($resume)->create();

        $this->actingAs($user)
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
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
            ->postJson(route('ai.generate-gap', $resume), [
                'keyword' => 'AWS',
                'experience_id' => $experience->id,
            ])
            ->assertStatus(429)
            ->assertJson(['message' => 'AI access is blocked.']);
    }
}
