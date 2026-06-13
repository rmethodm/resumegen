<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiControlsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_master_admin' => true]);
    }

    public function test_users_table_lists_ai_active_users(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();
        AiRequest::factory()->for($target)->create(['status' => 'success', 'estimated_cost_cents' => 7, 'created_at' => now()]);

        $this->actingAs($admin)->get(route('admin.ai.users'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Users')
                ->has('users.data', 1)
                ->where('users.data.0.id', $target->id)
                ->where('users.data.0.estimated_cost_cents', 7)
            );
    }

    public function test_reset_quota_sets_watermark(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();
        AiRequest::factory()->for($target)->create(['status' => 'success', 'created_at' => now()->startOfMonth()->addDay()]);
        $this->assertSame(1, UserLimits::aiRequestsThisMonth($target));

        $this->actingAs($admin)->patch(route('admin.ai.reset-quota', $target))->assertRedirect();

        $this->assertNotNull($target->fresh()->ai_usage_reset_at);
        $this->assertSame(0, UserLimits::aiRequestsThisMonth($target->fresh()));
    }

    public function test_set_limit_override_and_clear(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();

        $this->actingAs($admin)->patch(route('admin.ai.limit', $target), ['limit' => 500])->assertRedirect();
        $this->assertSame(500, $target->fresh()->ai_limit_override);

        $this->actingAs($admin)->patch(route('admin.ai.limit', $target), ['limit' => null])->assertRedirect();
        $this->assertNull($target->fresh()->ai_limit_override);
    }

    public function test_toggle_block_prevents_ai_use(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();

        $this->actingAs($admin)->patch(route('admin.ai.block', $target))->assertRedirect();

        $this->assertTrue($target->fresh()->ai_blocked);
        $this->assertFalse(UserLimits::canUseAi($target->fresh()));
    }

    public function test_controls_are_master_admin_only(): void
    {
        $nonAdmin = User::factory()->create(['is_master_admin' => false]);
        $target = User::factory()->create();

        $this->actingAs($nonAdmin)->patch(route('admin.ai.block', $target))->assertForbidden();
    }
}
