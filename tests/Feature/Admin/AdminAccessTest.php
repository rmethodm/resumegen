<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function adminHost(): string
    {
        return (string) config('app.admin_domain');
    }

    private function adminUrl(string $path = '/'): string
    {
        return 'http://'.$this->adminHost().$path;
    }

    public function test_guest_is_redirected_from_admin_dashboard(): void
    {
        $this->get($this->adminUrl('/'))
            ->assertRedirect();
    }

    public function test_non_admin_cannot_access_admin_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminUrl('/'))
            ->assertForbidden();
    }

    public function test_admin_on_main_host_does_not_serve_admin_dashboard_at_root(): void
    {
        $admin = User::factory()->admin()->create();

        // Main app root is the public welcome page, not the admin dashboard.
        $this->actingAs($admin)
            ->get('http://resumegen.test/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Welcome'));
    }

    public function test_admin_on_admin_host_sees_dashboard(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminUrl('/'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->has('users_count')
                ->has('signups_last_7_days')
                ->has('disabled_count'));
    }
}
