<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseOverviewTest extends TestCase
{
    use RefreshDatabase;

    private function adminPath(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_guest_is_redirected_from_database_overview(): void
    {
        $this->get($this->adminPath('/database'))->assertRedirect();
    }

    public function test_non_admin_cannot_view_database_overview(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminPath('/database'))
            ->assertForbidden();
    }

    public function test_admin_can_view_database_overview(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/database'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Database/Overview')
                ->has('engine_ok')
                ->has('stats')
                ->has('tables'));
    }
}
