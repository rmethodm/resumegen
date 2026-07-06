<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class CareerMapTest extends TestCase
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

    private function fakeServiceFailure(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            new \Exception('Simulated OpenAI outage'),
        ]));
    }

    private function samplePaths(): string
    {
        return json_encode([
            ['title' => 'Engineering Manager', 'reasoning' => 'Led two projects.', 'skill_gaps' => ['People management']],
            ['title' => 'Staff Engineer', 'reasoning' => 'Deep technical ownership.', 'skill_gaps' => ['System design']],
            ['title' => 'Solutions Architect', 'reasoning' => 'Cross-team scope.', 'skill_gaps' => ['Client communication']],
        ]);
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['error' => 'Career Map is a Pro feature.', 'required_tier' => 'pro']);
    }

    public function test_starter_user_gets_402(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['error' => 'Career Map is a Pro feature.', 'required_tier' => 'pro']);
    }

    public function test_pro_user_gets_three_paths(): void
    {
        $this->fakeReply($this->samplePaths());
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create([
            'experience' => [['title' => 'Backend Engineer', 'company' => 'Acme']],
            'skills' => ['PHP', 'Laravel'],
        ]);

        $res = $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume));

        $res->assertOk();
        $res->assertJsonCount(3, 'paths');
        $res->assertJsonStructure(['paths' => [['title', 'reasoning', 'skill_gaps']], 'remaining']);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'career_map',
            'status' => 'success',
        ]);
    }

    public function test_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['can_upgrade' => false, 'next_tier' => null]);
    }

    public function test_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(422);
    }

    public function test_ai_service_failure_returns_503(): void
    {
        $this->fakeServiceFailure();
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(503);
    }

    public function test_malformed_reply_returns_503(): void
    {
        $this->fakeReply('not valid json at all');
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(503);
    }

    public function test_edit_page_exposes_can_career_map_prop(): void
    {
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.edit', $resume))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('canCareerMap', true));
    }
}
