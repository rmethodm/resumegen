<?php

namespace Tests\Feature;

use App\Exceptions\ModerationException;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiServiceFlaggedTextTest extends TestCase
{
    use RefreshDatabase;

    public function test_flagged_input_text_is_stored_on_the_logged_row(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->create();

        try {
            app(AiService::class)->chat('the offending text', ['user' => $user, 'feature' => 'rewrite_bullet']);
            $this->fail('Expected ModerationException.');
        } catch (ModerationException) {
            // expected
        }

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'status' => 'flagged',
            'flagged_text' => 'the offending text',
        ]);
    }
}
