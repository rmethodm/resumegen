<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_returns_text_and_logs_a_request(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
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
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 1000, 'completion_tokens' => 1000, 'total_tokens' => 2000],
            ]),
        ]));

        app(AiService::class)->chat('hi');

        // 1000/1000 * 1.0 + 1000/1000 * 2.0 = 3 cents
        $this->assertDatabaseHas('ai_requests', ['estimated_cost_cents' => 3]);
    }

    public function test_chat_logs_error_and_rethrows_on_failure(): void
    {
        // The SDK fake replays canned responses; to exercise the catch branch we
        // bind a mock client whose chat()->create() throws.
        $mock = \Mockery::mock(ClientContract::class);
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
}
