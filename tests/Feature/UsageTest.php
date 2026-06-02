<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsageTest extends TestCase
{
    use RefreshDatabase;

    public function test_requires_auth(): void
    {
        $this->get('/usage')->assertRedirect('/login');
    }

    public function test_user_can_access_own_usage(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/usage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Usage/Index')
                ->has('totalCost')
                ->has('totalCalls')
                ->has('byFeature')
                ->has('byProvider')
                ->has('recentLogs')
            );
    }

    public function test_user_only_sees_own_logs(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();

        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'feature' => 'ats_score', 'input_tokens' => 500, 'output_tokens' => 200, 'cost_usd' => 0.0002,
        ]);
        AiUsageLog::create([
            'user_id' => $other->id, 'provider' => 'openai', 'model' => 'gpt-4o',
            'feature' => 'ai_suggest', 'input_tokens' => 300, 'output_tokens' => 100, 'cost_usd' => 0.0015,
        ]);

        $response = $this->actingAs($user)
            ->get('/usage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Usage/Index')
                ->where('totalCalls', 1)
            );
    }
}
