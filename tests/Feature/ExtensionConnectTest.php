<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExtensionConnectTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_view_the_connect_page(): void
    {
        $this->get(route('extension.connect'))
            ->assertRedirect(route('login'));
    }

    public function test_connect_page_requires_password_confirmation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('extension.connect'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_connect_page_renders_once_password_is_confirmed(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->get(route('extension.connect'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Auth/ExtensionConnect'));
    }

    public function test_issuing_a_connect_token_requires_password_confirmation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('extension.connect.token'))
            ->assertStatus(423);
    }

    public function test_issuing_a_connect_token_scopes_it_to_the_extension_ability_only(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->postJson(route('extension.connect.token'))
            ->assertOk()
            ->assertJsonStructure(['token']);

        $this->assertSame(1, $user->tokens()->count());
        $token = $user->tokens()->first();
        $this->assertSame(ResumeFillProfile::TOKEN_NAME, $token->name);
        $this->assertTrue($token->can(ResumeFillProfile::TOKEN_ABILITY));
        $this->assertFalse($token->can('*'));
        $this->assertNotEmpty($response->json('token'));
    }
}
