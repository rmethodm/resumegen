<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSupportTest extends TestCase
{
    use RefreshDatabase;

    private function adminUrl(string $path = '/'): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_admin_can_search_users_by_email(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['email' => 'needle@example.com']);
        User::factory()->create(['email' => 'other@example.com']);

        $this->actingAs($admin)
            ->get($this->adminUrl('/users?q='.urlencode('needle@example.com')))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Index')
                ->has('users.data', 1)
                ->where('users.data.0.email', 'needle@example.com'));
    }

    public function test_admin_can_view_user_detail(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['email' => 'detail@example.com']);

        $this->actingAs($admin)
            ->get($this->adminUrl('/users/'.$target->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Show')
                ->where('user.email', 'detail@example.com')
                ->has('user.tokens_count')
                ->has('user.resumes_count'));
    }
}
