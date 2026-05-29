<?php

namespace Tests\Feature\Api;

use App\Models\Resume;
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
