<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
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

    /**
     * The free tier's monthly AI quota is 0, but interview coach is metered
     * separately at 3 sessions/month — it is the one AI feature a free user is
     * meant to experience. If the global quota check ever gates this route for
     * free users again, those 3 sessions become unreachable and the tier loses
     * its only taste of the product's core value.
     */
    public function test_free_user_can_use_interview_coach_despite_zero_ai_quota(): void
    {
        $this->fakeQuestions();

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Product Manager',
        ]);

        $response->assertStatus(200);
        $this->assertSame(0, UserLimits::aiMonthlyLimit($user->fresh()));
    }

    public function test_ai_blocked_free_user_cannot_use_interview_coach(): void
    {
        $user = User::factory()->free()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Product Manager',
        ]);

        $response->assertStatus(402);
        $response->assertJsonPath('error', 'AI features are disabled for this account.');
    }

    public function test_free_user_blocked_after_3_uses(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        AiRequest::factory()->count(3)->create([
            'user_id' => $user->id,
            'feature' => 'interview_coach',
            'status' => 'success',
        ]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Software Engineer',
        ]);

        $response->assertStatus(402);
        $response->assertJsonPath('required_tier', 'starter');
    }

    public function test_starter_user_can_exceed_free_limit(): void
    {
        $this->fakeQuestions();

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        AiRequest::factory()->count(5)->create([
            'user_id' => $user->id,
            'feature' => 'interview_coach',
            'status' => 'success',
        ]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Software Engineer',
        ]);

        $response->assertStatus(200);
        $response->assertJsonCount(8, 'questions');
    }

    public function test_validation_requires_target_role(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['target_role']);
    }

    public function test_cannot_coach_another_users_resume(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Engineer',
        ]);

        $response->assertStatus(403);
    }

    public function test_response_includes_remaining_counts(): void
    {
        $this->fakeQuestions();

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson(route('builder.interview-coach', $resume), [
            'target_role' => 'Designer',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['questions', 'remaining', 'coach_uses_remaining']);
    }

    public function test_usage_logged_to_ai_requests(): void
    {
        $this->fakeQuestions();

        $user = User::factory()->starter()->create();
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
