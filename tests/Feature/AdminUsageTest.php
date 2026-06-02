<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsageTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_usage(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get('/admin/usage')
            ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_admin_usage(): void
    {
        $this->get('/admin/usage')->assertRedirect('/login');
    }

    public function test_admin_can_access_usage_page(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get('/admin/usage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Usage')
                ->has('totalCost')
                ->has('byProvider')
                ->has('byFeature')
                ->has('byModel')
                ->has('perUser')
                ->has('dateRange')
            );
    }

    public function test_admin_usage_aggregates_correctly(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'feature' => 'ats_score', 'input_tokens' => 500, 'output_tokens' => 200,
            'cost_usd' => 0.000195,
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'feature' => 'ai_suggest', 'input_tokens' => 300, 'output_tokens' => 150,
            'cost_usd' => 0.003150,
        ]);

        $this->actingAs($admin)
            ->get('/admin/usage?range=all')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Usage')
                ->where('totalCost', fn ($v) => abs($v - 0.003345) < 0.000001)
                ->has('byProvider', 2)
            );
    }
}
