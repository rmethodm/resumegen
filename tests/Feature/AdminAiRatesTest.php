<?php

namespace Tests\Feature;

use App\Models\AiModelRate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAiRatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_rates_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiModelRate::create([
            'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6',
            'input_cost_per_million' => 3.0,
            'output_cost_per_million' => 15.0,
            'effective_from' => now()->subDay(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.ai-rates.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/AiRates/Index')
                ->has('history.data', 1)
                ->has('current', 1)
            );
    }

    public function test_can_add_new_rate(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider' => 'openai',
                'model' => 'gpt-4o',
                'input_cost_per_million' => 5.0,
                'output_cost_per_million' => 15.0,
                'effective_from' => now()->toDateString(),
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('ai_model_rates', [
            'provider' => 'openai',
            'model' => 'gpt-4o',
        ]);
    }

    public function test_new_rate_supersedes_old_for_same_model(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiModelRate::create([
            'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'input_cost_per_million' => 3.0, 'output_cost_per_million' => 15.0,
            'effective_from' => now()->subMonth(),
        ]);

        $this->actingAs($admin)->post(route('admin.ai-rates.store'), [
            'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'input_cost_per_million' => 2.5, 'output_cost_per_million' => 12.0,
            'effective_from' => now()->toDateString(),
        ]);

        $this->assertDatabaseCount('ai_model_rates', 2);

        $current = AiModelRate::where('provider', 'anthropic')->where('model', 'claude-sonnet-4-6')
            ->latest('effective_from')->first();

        $this->assertEquals(2.5, $current->input_cost_per_million);
    }

    public function test_store_rejects_negative_cost(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider' => 'openai', 'model' => 'gpt-4o',
                'input_cost_per_million' => -1.0, 'output_cost_per_million' => 15.0,
                'effective_from' => now()->toDateString(),
            ])
            ->assertSessionHasErrors('input_cost_per_million');
    }

    public function test_store_rejects_past_effective_date(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.ai-rates.store'), [
                'provider' => 'openai', 'model' => 'gpt-4o',
                'input_cost_per_million' => 5.0, 'output_cost_per_million' => 15.0,
                'effective_from' => now()->subDay()->toDateString(),
            ])
            ->assertSessionHasErrors('effective_from');
    }

    public function test_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.ai-rates.index'))->assertForbidden();
    }
}
