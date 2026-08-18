<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseRoleControllerTest extends TestCase
{
    use RefreshDatabase;

    private function adminPath(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_guest_is_redirected_from_roles(): void
    {
        $this->get($this->adminPath('/database/roles'))->assertRedirect();
    }

    public function test_non_admin_cannot_view_roles(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminPath('/database/roles'))
            ->assertForbidden();
    }

    public function test_admin_can_view_roles_page(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/database/roles'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Database/Roles/Index')
                ->has('engine_ok')
                ->has('roles')
                ->has('grants'));
    }

    public function test_role_mutations_require_postgres(): void
    {
        // Test env runs on SQLite (see phpunit.xml) — CREATE ROLE/GRANT/REVOKE
        // are Postgres-only syntax, so these must refuse cleanly rather than
        // attempt to run Postgres DDL against SQLite.
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post($this->adminPath('/database/roles'), ['name' => 'readonly_role'])
            ->assertStatus(422);
    }
}
