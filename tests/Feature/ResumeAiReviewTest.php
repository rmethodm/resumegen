<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class ResumeAiReviewTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    private function subscribedUserWithCredits(int $credits = 5): User
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, $credits, 'admin');

        return $user;
    }

    private function fakeReviewResponse(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => '{"suggestions":[{"id":"s1","label":"Tighten the summary","severity":"medium","section":"summary","detail":"Cut it to two sentences."}]}']],
                ],
                'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 20],
            ]),
        ]);
    }

    public function test_unsubscribed_user_gets_402(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);
    }

    public function test_ai_blocked_user_gets_429(): void
    {
        $user = $this->subscribedUserWithCredits();
        $user->forceFill(['ai_blocked' => true])->save();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertStatus(429);
    }

    public function test_tailor_jd_without_a_jd_is_rejected(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create(['target_job_description' => '']);

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'tailor_jd'])
            ->assertStatus(422);
    }

    public function test_successful_review_spends_credits_and_caches_result(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create();
        $this->fakeReviewResponse();

        $response = $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general']);

        $response->assertOk()->assertJsonPath('suggestions.0.id', 's1');
        $this->assertSame(2, app(AiCreditService::class)->balance($user));

        $resume->refresh();
        $this->assertSame('s1', $resume->ai_review[0]['id']);
        $this->assertNotNull($resume->ai_review_generated_at);
        $this->assertSame('general', $resume->ai_review_preset);
    }

    public function test_non_owner_gets_404(): void
    {
        $owner = $this->subscribedUserWithCredits();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertNotFound();
    }

    public function test_invalid_preset_is_rejected(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'not-a-preset'])
            ->assertStatus(422);
    }
}
