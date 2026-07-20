<?php

namespace Tests\Feature;

use App\Exceptions\ModerationException;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_returns_text_and_logs_a_request(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [
                    ['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'pong']],
                ],
                'usage' => ['prompt_tokens' => 12, 'completion_tokens' => 3, 'total_tokens' => 15],
            ]),
        ]));

        $user = User::factory()->create();

        $reply = app(AiService::class)->chat('ping', ['user' => $user, 'feature' => 'smoke']);

        $this->assertSame('pong', $reply);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'smoke',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 12,
            'completion_tokens' => 3,
            'total_tokens' => 15,
            'status' => 'success',
        ]);
    }

    public function test_chat_estimates_cost_from_pricing(): void
    {
        config()->set('ai.pricing', ['gpt-4o-mini' => ['input' => 1.0, 'output' => 2.0]]);

        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 1000, 'completion_tokens' => 1000, 'total_tokens' => 2000],
            ]),
        ]));

        app(AiService::class)->chat('hi');

        // 1000/1000 * 1.0 + 1000/1000 * 2.0 = 3 cents = 3,000,000 micro-cents
        $this->assertDatabaseHas('ai_requests', ['estimated_cost_micro_cents' => 3_000_000]);
    }

    /**
     * The round-number pricing above cannot catch the bug this guards: at the real
     * gpt-4o-mini rates a call costs a small fraction of a cent, and rounding to whole
     * cents logged 0 for every OpenAI request ever made. Everything downstream reads
     * that column — ai:cost-alert could never fire, and the admin spend figures were
     * all $0.00. Use the shipped pricing, not a convenient stand-in.
     */
    public function test_chat_logs_a_nonzero_cost_at_real_gpt_4o_mini_pricing(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 1500, 'completion_tokens' => 400, 'total_tokens' => 1900],
            ]),
        ]));

        app(AiService::class)->chat('hi');

        // 1.5 * 0.015 + 0.4 * 0.06 = 0.0465 cents — which round() flattened to 0.
        $this->assertDatabaseHas('ai_requests', ['estimated_cost_micro_cents' => 46_500]);
    }

    public function test_chat_logs_error_and_rethrows_on_failure(): void
    {
        // The SDK fake replays canned responses; to exercise the catch branch we
        // bind a mock client whose chat()->create() throws.
        $mock = \Mockery::mock(ClientContract::class);
        $mock->shouldReceive('moderations->create')
            ->andReturn(ModerationResponse::fake(['results' => [['flagged' => false]]]));
        $mock->shouldReceive('chat->create')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(ClientContract::class, $mock);

        $user = User::factory()->create();

        try {
            app(AiService::class)->chat('ping', ['user' => $user]);
            $this->fail('Expected exception was not thrown.');
        } catch (\RuntimeException $e) {
            $this->assertSame('boom', $e->getMessage());
        }

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'status' => 'error',
        ]);
    }

    public function test_flagged_input_throws_logs_flagged_and_skips_chat(): void
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        $user = User::factory()->create();

        $this->expectException(ModerationException::class);

        try {
            app(AiService::class)->chat('bad stuff', ['user' => $user, 'feature' => 'smoke']);
        } finally {
            $this->assertDatabaseHas('ai_requests', [
                'user_id' => $user->id,
                'feature' => 'smoke',
                'status' => 'flagged',
            ]);
            $fake->assertNotSent(Chat::class);
        }
    }

    public function test_chat_payload_includes_user_and_max_tokens(): void
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
            ]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        $user = User::factory()->create();
        app(AiService::class)->chat('hi', ['user' => $user]);

        $fake->assertSent(Chat::class, fn (string $method, array $parameters): bool => $method === 'create'
            && $parameters['user'] === 'user_'.$user->id
            && $parameters['max_tokens'] === 1000);
    }
}
