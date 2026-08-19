<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WelcomePageTest extends TestCase
{
    use RefreshDatabase;

    // Marketing copy free-forever / banned-phrase fence lives in
    // resources/js/Components/marketing/marketing-content.test.ts (Vitest).
    // Do not assertSee React tree strings here — Welcome is client-rendered.

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
