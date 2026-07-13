<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    public function test_rewrite_bullet_returns_suggestion_and_logs_success(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->fakeReply('Led a team of five engineers to ship X.');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'managed a team of five']
        );

        $res->assertOk()
            ->assertJson(['suggestion' => 'Led a team of five engineers to ship X.', 'remaining' => 9]);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'rewrite_bullet',
            'status' => 'success',
        ]);
    }

    public function test_rewrite_bullet_accepts_a_long_bullets_block(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->fakeReply('Rewritten.');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        // A multi-line experience bullets block can exceed the old 2000-char cap.
        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => str_repeat('Delivered measurable impact across teams. ', 80)] // ~3360 chars
        )->assertOk()->assertJson(['suggestion' => 'Rewritten.']);
    }

    public function test_critique_bullet_returns_questions_and_logs_success(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->fakeReply("How many people were on the team?\nDid revenue move — by how much?");
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.critique-bullet', $resume),
            ['text' => 'Responsible for managing the sales team.']
        );

        $res->assertOk()->assertJson([
            'questions' => ['How many people were on the team?', 'Did revenue move — by how much?'],
            'remaining' => 9,
        ]);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'critique_bullet',
            'status' => 'success',
        ]);
    }

    /**
     * The model is told to return nothing when a bullet is already specific. An empty list must
     * surface as "no questions", not as a broken response — the UI shows no coach card at all.
     */
    public function test_critique_bullet_returns_no_questions_for_an_already_strong_bullet(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->fakeReply('');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.critique-bullet', $resume),
            ['text' => 'Grew regional ARR from $1.2M to $1.9M across 2 years leading an 8-person team.']
        )->assertOk()->assertJson(['questions' => []]);
    }

    /**
     * Models like to number their lists. The bullets the user sees must not come back as
     * "1. How many people?" — the numbering is stripped server-side.
     */
    public function test_critique_bullet_strips_numbering_and_caps_at_three_questions(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->fakeReply("1. How many people?\n2. Over what period?\n3. Did revenue move?\n4. Anything else?");
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.critique-bullet', $resume),
            ['text' => 'Managed the team.']
        );

        $res->assertOk()->assertJson([
            'questions' => ['How many people?', 'Over what period?', 'Did revenue move?'],
        ]);
    }

    public function test_critique_bullet_is_forbidden_on_another_users_resume(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for(User::factory()->free()->create())->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.critique-bullet', $resume),
            ['text' => 'Managed the team.']
        )->assertForbidden();
    }

    public function test_critique_bullet_returns_402_when_quota_is_exhausted(): void
    {
        config()->set('ai.monthly_limits.free', 0);
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.critique-bullet', $resume),
            ['text' => 'Managed the team.']
        )->assertStatus(402);
    }

    public function test_ats_keywords_split_into_array(): void
    {
        $this->fakeReply("Kubernetes, Terraform\nObservability"); // double quotes: real newline
        $user = User::factory()->starter()->create();
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
        $user = User::factory()->starter()->create();
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
        config()->set('ai.monthly_limits.free', 10);
        $mock = \Mockery::mock(ClientContract::class);
        $mock->shouldReceive('moderations->create')
            ->andReturn(ModerationResponse::fake(['results' => [['flagged' => false]]]));
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

    public function test_flagged_input_returns_422_and_does_not_count_quota(): void
    {
        config()->set('ai.monthly_limits.free', 10);
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'something disallowed']
        )->assertStatus(422)
            ->assertJson(['error' => "This content can't be processed."]);

        $this->assertDatabaseHas('ai_requests', ['user_id' => $user->id, 'status' => 'flagged']);
        $this->assertSame(0, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_edit_page_exposes_ai_quota_props(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.edit', $resume))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('aiRemaining', 0)
                ->where('aiCanUpgrade', true)
            );
    }
}
