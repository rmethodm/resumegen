<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class InterviewCoachTest extends TestCase
{
    use RefreshDatabase;

    private function fakeQuestions(): void
    {
        $questions = json_encode(array_map(
            fn ($i) => ['question' => "Question {$i}?", 'hint' => "Think about time {$i}"],
            range(1, 8)
        ));

        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $questions]]],
                'usage' => ['prompt_tokens' => 200, 'completion_tokens' => 400, 'total_tokens' => 600],
            ]),
        ]));
    }

    public function test_ai_blocked_free_user_cannot_use_interview_coach(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Product Manager',
        ]);

        $response->assertStatus(402);
        $response->assertJsonPath('error', 'AI features are disabled for this account.');
    }

    public function test_validation_requires_target_role(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['target_role']);
    }

    public function test_cannot_coach_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Engineer',
        ]);

        $response->assertStatus(403);
    }

    public function test_usage_logged_to_ai_requests(): void
    {
        $this->fakeQuestions();

        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Designer',
        ]);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'interview_coach',
            'status' => 'success',
        ]);
    }
}
