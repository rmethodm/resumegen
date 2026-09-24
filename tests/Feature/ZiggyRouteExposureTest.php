<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * @routes prints route names and URIs into every page's HTML. The admin
 * surface must not be advertised to guests or ordinary users — only the
 * admin, whose pages call route('admin.schedule.update'), gets it.
 */
class ZiggyRouteExposureTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_page_does_not_publish_admin_routes(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('"dashboard"', false)
            ->assertDontSee('admin.schedule', false);
    }

    public function test_regular_user_page_does_not_publish_admin_routes(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertDontSee('admin.schedule', false);
    }

    public function test_admin_page_publishes_admin_routes(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingAs($admin)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertSee('admin.schedule.update', false)
            ->assertSee('"dashboard"', false);
    }
}
