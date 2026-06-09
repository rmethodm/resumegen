<?php

namespace Tests\Feature\Admin;

use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_inbox_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        PortfolioMessage::factory()->count(5)->create(['user_id' => $admin->id]);

        $this->actingAs($admin)
            ->get(route('admin.messages.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Messages/Index')
                ->has('messages.data', 5)
            );
    }

    public function test_unread_filter_returns_only_unread(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        PortfolioMessage::factory()->count(3)->create(['user_id' => $admin->id, 'read_at' => null]);
        PortfolioMessage::factory()->count(2)->create(['user_id' => $admin->id, 'read_at' => now()]);

        $this->actingAs($admin)
            ->get(route('admin.messages.index', ['filter' => 'unread']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('messages.data', 3));
    }

    public function test_mark_read_sets_read_at(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $message = PortfolioMessage::factory()->create(['user_id' => $admin->id, 'read_at' => null]);

        $this->actingAs($admin)
            ->patch(route('admin.messages.read', $message))
            ->assertRedirect();

        $this->assertNotNull($message->fresh()->read_at);
    }

    public function test_delete_removes_message(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $message = PortfolioMessage::factory()->create(['user_id' => $admin->id]);

        $this->actingAs($admin)
            ->delete(route('admin.messages.destroy', $message))
            ->assertRedirect();

        $this->assertDatabaseMissing('portfolio_messages', ['id' => $message->id]);
    }

    public function test_messages_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.messages.index'))->assertForbidden();
    }
}
