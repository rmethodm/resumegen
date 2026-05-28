<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- isPro() unit tests ---

    public function test_is_pro_returns_true_when_is_pro_flag_set(): void
    {
        $user = User::factory()->create(['is_pro' => true]);

        $this->assertTrue($user->isPro());
    }

    public function test_is_pro_returns_false_when_neither_flag_nor_subscription(): void
    {
        $user = User::factory()->create(['is_pro' => false]);

        $this->assertFalse($user->isPro());
    }

    // --- Access control ---

    public function test_guest_cannot_access_admin(): void
    {
        $this->get(route('admin.users.index'))->assertRedirect(route('login'));
    }

    public function test_regular_user_cannot_access_admin(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_master_admin_can_access_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Users/Index'));
    }

    // --- togglePro ---

    public function test_admin_can_upgrade_user_to_pro(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create(['is_pro' => false]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $user))
            ->assertRedirect();

        $this->assertTrue($user->fresh()->is_pro);
    }

    public function test_admin_can_downgrade_pro_user(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create(['is_pro' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $user))
            ->assertRedirect();

        $this->assertFalse($user->fresh()->is_pro);
    }

    public function test_admin_cannot_toggle_pro_on_another_admin(): void
    {
        $admin       = User::factory()->create(['is_master_admin' => true]);
        $otherAdmin  = User::factory()->create(['is_master_admin' => true, 'is_pro' => false]);

        $this->actingAs($admin)
            ->patch(route('admin.users.toggle-pro', $otherAdmin))
            ->assertRedirect();

        $this->assertFalse($otherAdmin->fresh()->is_pro);
    }

    // --- destroy ---

    public function test_admin_can_delete_regular_user(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $user))
            ->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $admin))
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_cannot_delete_another_admin(): void
    {
        $admin      = User::factory()->create(['is_master_admin' => true]);
        $otherAdmin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', $otherAdmin))
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['id' => $otherAdmin->id]);
    }

    public function test_regular_user_cannot_delete_anyone(): void
    {
        $user   = User::factory()->create(['is_master_admin' => false]);
        $target = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.users.destroy', $target))
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }
}
