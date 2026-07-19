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

class JobRankingTest extends TestCase
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

    private function listings(): array
    {
        return [
            ['id' => 'adzuna:a1', 'title' => 'Product Manager', 'company' => 'Acme', 'description' => 'Own the roadmap.'],
            ['id' => 'adzuna:a2', 'title' => 'Warehouse Lead', 'company' => 'Bolt', 'description' => 'Manage the floor.'],
        ];
    }

    public function test_scores_come_back_keyed_to_the_listings_that_were_sent(): void
    {
        config()->set('ai.monthly_limit', 10);
        $this->fakeReply(json_encode(['scores' => [
            ['id' => 'adzuna:a1', 'score' => 88, 'reason' => 'Five years of roadmap ownership.'],
            ['id' => 'adzuna:a2', 'score' => 12, 'reason' => 'No warehouse experience.'],
        ]]));
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertOk()
            ->assertJsonPath('scores.adzuna:a1.score', 88)
            ->assertJsonPath('scores.adzuna:a2.score', 12)
            ->assertJsonPath('scores.adzuna:a1.reason', 'Five years of roadmap ownership.');
    }

    /**
     * A model that returns an id we never sent must not be able to attach a
     * score to a listing the user is not looking at.
     */
    public function test_scores_for_listings_that_were_never_sent_are_discarded(): void
    {
        config()->set('ai.monthly_limit', 10);
        $this->fakeReply(json_encode(['scores' => [
            ['id' => 'adzuna:a1', 'score' => 70, 'reason' => 'Close enough.'],
            ['id' => 'made-up-id', 'score' => 99, 'reason' => 'Invented.'],
        ]]));
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertOk()
            ->assertJsonCount(1, 'scores')
            ->assertJsonMissingPath('scores.made-up-id');
    }

    /**
     * Scores drive a visible percentage. An out-of-range number from the model
     * would render as "412% match", so clamp rather than trust.
     */
    public function test_out_of_range_scores_are_clamped(): void
    {
        config()->set('ai.monthly_limit', 10);
        $this->fakeReply(json_encode(['scores' => [
            ['id' => 'adzuna:a1', 'score' => 412, 'reason' => 'Great.'],
            ['id' => 'adzuna:a2', 'score' => -30, 'reason' => 'Bad.'],
        ]]));
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertJsonPath('scores.adzuna:a1.score', 100)
            ->assertJsonPath('scores.adzuna:a2.score', 0);
    }

    /**
     * Ranking is metered like every other AI feature. Without the gate, paging
     * through results would be an unbounded spend.
     */
    public function test_ranking_is_blocked_when_the_monthly_ai_limit_is_reached(): void
    {
        config()->set('ai.monthly_limit', 0);
        $this->fakeReply('{}');
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertStatus(402);
    }

    public function test_a_user_cannot_rank_against_another_users_resume(): void
    {
        config()->set('ai.monthly_limit', 10);
        $this->fakeReply('{}');
        $user = User::factory()->create();
        $theirResume = Resume::factory()->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $theirResume->id, 'listings' => $this->listings()])
            ->assertForbidden();
    }

    /**
     * A suspended AI feature must look absent, not plan-gated — the same 404
     * contract the other AI routes have.
     */
    public function test_ranking_404s_when_ai_is_disabled(): void
    {
        config()->set('ai.enabled', false);
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertNotFound();
    }

    /**
     * Billing was removed; nothing in this feature may reintroduce a paywall.
     */
    public function test_ranking_never_sets_a_feature_gate(): void
    {
        config()->set('ai.monthly_limit', 0);
        $this->fakeReply('{}');
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('jobs.rank'), ['resume_id' => $resume->id, 'listings' => $this->listings()])
            ->assertSessionMissing('featureGate');
    }
}
