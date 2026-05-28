<?php

namespace Tests\Feature;

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
}
