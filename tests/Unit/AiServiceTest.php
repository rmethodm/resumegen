<?php

namespace Tests\Unit;

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

    private function fake(): ClientFake
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'reply']]],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
            ]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        return $fake;
    }

    public function test_default_behavior_sends_single_prompt_message(): void
    {
        $fake = $this->fake();

        app(AiService::class)->chat('Hello');

        $fake->assertSent(Chat::class, function ($method, $parameters) {
            return $method === 'create'
                && $parameters['messages'] === [['role' => 'user', 'content' => 'Hello']];
        });
    }

    public function test_messages_option_overrides_default_array(): void
    {
        $fake = $this->fake();

        $history = [
            ['role' => 'system', 'content' => 'You are a coach.'],
            ['role' => 'user', 'content' => 'Hi'],
            ['role' => 'assistant', 'content' => 'Hello!'],
            ['role' => 'user', 'content' => 'Hello'],
        ];

        app(AiService::class)->chat('Hello', ['messages' => $history]);

        $fake->assertSent(Chat::class, function ($method, $parameters) use ($history) {
            return $method === 'create' && $parameters['messages'] === $history;
        });
    }
}
