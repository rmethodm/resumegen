<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_start_impersonation(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $user))
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertEquals($user->id, session('impersonating_id'));
        $this->assertEquals($admin->id, session('impersonator_id'));
    }

    public function test_stop_impersonation_restores_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $user));

        $this->delete(route('admin.impersonate.destroy'))
            ->assertRedirect(route('admin.users.index'));

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
        $this->assertNull(session('impersonator_id'));
    }

    public function test_cannot_impersonate_master_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $other = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $other))
            ->assertRedirect();

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
    }

    public function test_cannot_impersonate_self(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $admin))
            ->assertRedirect();

        $this->assertAuthenticatedAs($admin);
        $this->assertNull(session('impersonating_id'));
    }

    public function test_impersonation_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.users.impersonate', $target))
            ->assertForbidden();
    }
}
