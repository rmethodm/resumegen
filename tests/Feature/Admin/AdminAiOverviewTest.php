<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_is_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.ai.overview'))->assertForbidden();
    }

    public function test_admin_sees_totals_and_breakdowns(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiRequest::factory()->for($admin)->count(2)->create([
            'status' => 'success', 'feature' => 'summary', 'estimated_cost_cents' => 5,
            'created_at' => now(),
        ]);

        $this->actingAs($admin)->get(route('admin.ai.overview'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Overview')
                ->where('period', '30d')
                ->where('totals.requests', 2)
                ->where('totals.estimated_cost_cents', 10)
                ->has('series')
                ->has('byFeature')
                ->has('byModel')
                ->has('byStatus')
                ->has('openAiCostCents') // null or int — present either way
            );
    }
}
