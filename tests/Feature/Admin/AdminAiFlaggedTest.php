<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiFlaggedTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_lists_flagged_rows_with_text(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'nasty input', 'created_at' => now()]);

        $this->actingAs($admin)->get(route('admin.ai.flagged'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Flagged')
                ->has('items.data', 1)
                ->where('items.data.0.flagged_text', 'nasty input')
            );
    }

    public function test_destroy_removes_a_flagged_entry(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $row = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'x']);

        $this->actingAs($admin)->delete(route('admin.ai.flagged.destroy', $row))->assertRedirect();

        $this->assertDatabaseMissing('ai_requests', ['id' => $row->id]);
    }

    public function test_prune_command_nulls_old_text_but_keeps_row(): void
    {
        $old = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'old', 'created_at' => now()->subDays(120)]);
        $recent = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'recent', 'created_at' => now()->subDays(10)]);

        $this->artisan('ai:prune-flagged', ['--days' => 90])->assertExitCode(0);

        $this->assertNull($old->fresh()->flagged_text);
        $this->assertDatabaseHas('ai_requests', ['id' => $old->id]); // row kept
        $this->assertSame('recent', $recent->fresh()->flagged_text);
    }

    public function test_queue_is_master_admin_only(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.ai.flagged'))->assertForbidden();
    }
}
