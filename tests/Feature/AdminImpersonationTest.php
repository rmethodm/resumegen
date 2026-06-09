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

    public function test_destroy_with_non_admin_impersonator_id_does_not_login_as_that_user(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $victim = User::factory()->create();
        $regularUser = User::factory()->create();

        // Start a legitimate impersonation session
        $this->actingAs($admin)
            ->post(route('admin.users.impersonate', $victim));

        // Tamper the session: replace impersonator_id with a non-admin user
        session(['impersonator_id' => $regularUser->id]);

        $this->delete(route('admin.impersonate.destroy'))
            ->assertRedirect(route('admin.users.index'));

        // Should NOT be logged in as the regular user
        $this->assertNotEquals($regularUser->id, auth()->id());
    }

    public function test_destroy_without_active_impersonation_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.impersonate.destroy'))
            ->assertRedirect(route('dashboard'));
    }
}
