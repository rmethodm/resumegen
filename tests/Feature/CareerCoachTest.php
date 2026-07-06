<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\CareerCoachMessage;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class CareerCoachTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content = 'Here is some advice.'): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 50, 'total_tokens' => 150],
            ]),
        ]));
    }

    private function fakeFlagged(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
    }

    private function fakeServiceFailure(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            new \Exception('OpenAI service unavailable'),
        ]));
    }

    public function test_index_returns_402_for_starter_user(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->get(route('career-coach.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('canUseCareerCoach', false));
    }

    public function test_send_returns_402_for_starter_user(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Hi']);

        $response->assertStatus(402);
        $response->assertJsonPath('required_tier', 'pro');
        $this->assertDatabaseCount('career_coach_messages', 0);
    }

    public function test_pro_user_can_send_and_receive_reply(): void
    {
        $this->fakeReply('Focus on your Laravel experience.');
        $user = User::factory()->pro()->create();
        Resume::factory()->create(['user_id' => $user->id, 'updated_at' => now()]);

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), [
            'message' => 'How do I pivot into backend roles?',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message.role', 'assistant');
        $response->assertJsonPath('message.content', 'Focus on your Laravel experience.');

        $this->assertDatabaseHas('career_coach_messages', [
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'How do I pivot into backend roles?',
        ]);
        $this->assertDatabaseHas('career_coach_messages', [
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => 'Focus on your Laravel experience.',
        ]);
    }

    public function test_history_capped_at_20_messages_sent_to_ai(): void
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
            ]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        $user = User::factory()->agency()->create();
        CareerCoachMessage::factory()->count(25)->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Latest question']);

        $fake->assertSent(Chat::class, function ($method, $parameters) {
            // 1 system message + 20 history messages (capped), including the just-created user message.
            return $method === 'create' && count($parameters['messages']) === 21;
        });
    }

    public function test_moderation_rejection_keeps_user_message_without_assistant_reply(): void
    {
        $this->fakeFlagged();
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), [
            'message' => 'flagged content',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('career_coach_messages', ['user_id' => $user->id, 'role' => 'user']);
        $this->assertDatabaseMissing('career_coach_messages', ['user_id' => $user->id, 'role' => 'assistant']);
    }

    public function test_ai_quota_exhausted_keeps_user_message_without_assistant_reply(): void
    {
        $user = User::factory()->pro()->create();
        AiRequest::factory()->count(500)->create(['user_id' => $user->id, 'status' => 'success']);

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Hi']);

        $response->assertStatus(402);
        $this->assertDatabaseHas('career_coach_messages', ['user_id' => $user->id, 'role' => 'user']);
        $this->assertDatabaseMissing('career_coach_messages', ['user_id' => $user->id, 'role' => 'assistant']);
    }

    public function test_ai_service_failure_returns_503_keeping_user_message_without_assistant_reply(): void
    {
        $this->fakeServiceFailure();
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), [
            'message' => 'How do I pivot into backend roles?',
        ]);

        $response->assertStatus(503);
        $this->assertDatabaseHas('career_coach_messages', ['user_id' => $user->id, 'role' => 'user']);
        $this->assertDatabaseMissing('career_coach_messages', ['user_id' => $user->id, 'role' => 'assistant']);
    }

    public function test_validation_requires_message(): void
    {
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message']);
    }
}
