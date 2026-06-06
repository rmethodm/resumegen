<?php

namespace Tests\Feature\Api;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

class AiSuggestApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_ai_suggest_returns_suggestions(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => '["Suggestion A","Suggestion B","Suggestion C"]']],
            ], 200),
        ]);

        config(['services.anthropic.key' => 'fake-key']);

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/resumes/{$resume->id}/ai-suggest", [
                'field' => 'summary',
                'context' => ['title' => 'Engineer', 'summary' => 'Old text'],
                'provider' => 'claude',
            ])
            ->assertOk()
            ->assertJsonPath('suggestions.0', 'Suggestion A');
    }

    public function test_api_ai_suggest_returns_402_when_at_limit(): void
    {
        config(['services.anthropic.key' => 'fake-key']);

        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $user->createToken('test')->plainTextToken;

        for ($i = 0; $i < 30; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now(),
            ]);
        }

        $this->withToken($token)
            ->postJson("/api/resumes/{$resume->id}/ai-suggest", [
                'field' => 'summary', 'context' => ['title' => 'Dev'], 'provider' => 'claude',
            ])
            ->assertStatus(402)
            ->assertJsonPath('required_tier', 'starter');
    }

    public function test_cannot_suggest_for_other_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $token = $other->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/resumes/{$resume->id}/ai-suggest", [
                'field' => 'summary',
                'context' => [],
                'provider' => 'claude',
            ])
            ->assertForbidden();
    }
}
