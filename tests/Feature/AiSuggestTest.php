<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiSuggestTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_get_suggestions(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(401);
    }

    public function test_missing_api_key_returns_422(): void
    {
        config(['services.anthropic.key' => null]);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'API key not configured']);
    }

    public function test_claude_returns_three_suggestions(): void
    {
        Http::fake([
            'https://api.anthropic.com/*' => Http::response(json_encode([
                'content' => [[
                    'type' => 'text',
                    'text' => '["Suggestion one","Suggestion two","Suggestion three"]',
                ]],
            ]), 200),
        ]);

        config(['services.anthropic.key' => 'test-key']);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'I am a developer'],
            'provider' => 'claude',
        ]);

        $response->assertOk();
        $response->assertJsonCount(3, 'suggestions');
    }

    public function test_cannot_suggest_for_another_users_resume(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($other)->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'hi'],
            'provider' => 'claude',
        ]);

        $response->assertStatus(403);
    }

    public function test_openai_missing_api_key_returns_422(): void
    {
        config(['services.openai.key' => null]);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'I am a developer'],
            'provider' => 'openai',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'API key not configured']);
    }

    public function test_free_user_at_lifetime_ai_limit_gets_402(): void
    {
        config(['services.anthropic.key' => 'test-key']);
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        for ($i = 0; $i < 5; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now()->subMonths(3),
            ]);
        }

        $this->actingAs($user)
            ->postJson(route('builder.ai-suggest', $resume->id), [
                'field' => 'summary', 'context' => ['summary' => 'test'], 'provider' => 'claude',
            ])
            ->assertStatus(402)
            ->assertJson(['required_tier' => 'starter']);
    }

    public function test_starter_user_at_monthly_ai_limit_gets_402(): void
    {
        config(['services.anthropic.key' => 'test-key']);
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        for ($i = 0; $i < 30; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now(),
            ]);
        }

        $this->actingAs($user)
            ->postJson(route('builder.ai-suggest', $resume->id), [
                'field' => 'summary', 'context' => ['summary' => 'test'], 'provider' => 'claude',
            ])
            ->assertStatus(402)
            ->assertJson(['required_tier' => 'pro']);
    }

    public function test_claude_model_is_configurable_via_services_config(): void
    {
        Http::fake([
            'https://api.anthropic.com/*' => Http::response(json_encode([
                'content' => [['type' => 'text', 'text' => '["A","B","C"]']],
            ]), 200),
        ]);

        config(['services.anthropic.key' => 'test-key']);
        config(['services.anthropic.model' => 'claude-custom-model']);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary',
            'context' => ['summary' => 'test'],
            'provider' => 'claude',
        ]);

        Http::assertSent(fn ($req) => $req['model'] === 'claude-custom-model');
    }

    public function test_title_over_limit_returns_422(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume), [
            'field' => 'title',
            'provider' => 'claude',
            'context' => ['title' => str_repeat('a', 101)],
        ])->assertUnprocessable();
    }

    public function test_summary_over_limit_returns_422(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume), [
            'field' => 'summary',
            'provider' => 'claude',
            'context' => ['summary' => str_repeat('a', 1501)],
        ])->assertUnprocessable();
    }

    public function test_skills_array_over_limit_returns_422(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('builder.ai-suggest', $resume), [
            'field' => 'skills',
            'provider' => 'claude',
            'context' => ['skills' => array_fill(0, 51, 'PHP')],
        ])->assertUnprocessable();
    }
}
