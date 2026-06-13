<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    public function test_rewrite_bullet_returns_suggestion_and_logs_success(): void
    {
        $this->fakeReply('Led a team of five engineers to ship X.');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'managed a team of five']
        );

        $res->assertOk()
            ->assertJson(['suggestion' => 'Led a team of five engineers to ship X.', 'remaining' => 24]);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'rewrite_bullet',
            'status' => 'success',
        ]);
    }

    public function test_rewrite_bullet_accepts_a_long_bullets_block(): void
    {
        $this->fakeReply('Rewritten.');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        // A multi-line experience bullets block can exceed the old 2000-char cap.
        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => str_repeat('Delivered measurable impact across teams. ', 80)] // ~3360 chars
        )->assertOk()->assertJson(['suggestion' => 'Rewritten.']);
    }

    public function test_ats_keywords_split_into_array(): void
    {
        $this->fakeReply("Kubernetes, Terraform\nObservability"); // double quotes: real newline
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.ats-keywords', $resume),
            ['role' => 'SRE']
        );

        $res->assertOk()->assertJson(['keywords' => ['Kubernetes', 'Terraform', 'Observability']]);
    }

    public function test_ats_keywords_accepts_a_target_job_description(): void
    {
        $this->fakeReply('GraphQL, Kafka');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.ats-keywords', $resume),
            ['job_description' => 'We need a backend engineer fluent in GraphQL and Kafka.']
        )->assertOk()->assertJson(['keywords' => ['GraphQL', 'Kafka']]);
    }

    public function test_over_quota_free_user_gets_upgrade_payload(): void
    {
        config()->set('ai.monthly_limits.free', 0);
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        );

        $res->assertStatus(402)
            ->assertJson(['can_upgrade' => true, 'next_tier' => 'starter', 'limit' => 0]);
        $this->assertDatabaseCount('ai_requests', 0); // gate runs before any OpenAI call
    }

    public function test_over_quota_pro_user_gets_no_upgrade(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(402)->assertJson(['can_upgrade' => false, 'next_tier' => null]);
    }

    public function test_openai_failure_returns_503_and_does_not_count(): void
    {
        $mock = \Mockery::mock(ClientContract::class);
        $mock->shouldReceive('chat->create')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(ClientContract::class, $mock);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(503);

        $this->assertDatabaseHas('ai_requests', ['user_id' => $user->id, 'status' => 'error']);
        $this->assertSame(0, UserLimits::aiRequestsThisMonth($user->fresh()));
    }

    public function test_cannot_use_another_users_resume(): void
    {
        $this->fakeReply('x');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for(User::factory()->free())->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(403);
    }

    public function test_rewrite_bullet_requires_text(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.rewrite-bullet', $resume), [])
            ->assertStatus(422);
    }

    public function test_summary_422_when_no_content(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create(['experience' => [], 'skills' => []]);

        $this->actingAs($user)->postJson(route('builder.ai.summary', $resume), [])
            ->assertStatus(422);
    }

    public function test_edit_page_exposes_ai_quota_props(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.edit', $resume))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('aiRemaining', 25)
                ->where('aiCanUpgrade', true)
            );
    }
}
