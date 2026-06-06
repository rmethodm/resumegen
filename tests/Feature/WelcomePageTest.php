<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WelcomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_page_does_not_leak_framework_version(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->missing('laravelVersion')
            ->missing('phpVersion')
        );
    }

    public function test_guest_sees_welcome_page(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->where('auth.user', null)
        );
    }

    public function test_authenticated_user_sees_welcome_page_with_user_prop(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
            ->has('auth.user')
            ->where('auth.user.id', $user->id)
        );
    }
}
