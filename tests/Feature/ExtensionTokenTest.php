<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExtensionTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_extension_token(): void
    {
        $this->post(route('profile.extension-tokens.store'))
            ->assertRedirect(route('login'));
    }

    public function test_user_can_create_and_revoke_extension_token(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('profile.extension-tokens.store'))
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('extension_token_plain')
            ->assertSessionHas('status', 'extension-token-created');

        $this->assertSame(1, $user->tokens()->count());
        $token = $user->tokens()->first();
        $this->assertSame(ResumeFillProfile::TOKEN_NAME, $token->name);
        $this->assertTrue($token->can(ResumeFillProfile::TOKEN_ABILITY));

        $this->actingAs($user)
            ->delete(route('profile.extension-tokens.destroy', $token))
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('status', 'extension-token-revoked');

        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    public function test_creating_token_requires_password_confirmation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.extension-tokens.store'))
            ->assertRedirect(route('password.confirm'));

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_user_cannot_revoke_another_users_token(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $token = $owner->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->accessToken;

        $this->actingAs($other)
            ->delete(route('profile.extension-tokens.destroy', $token))
            ->assertNotFound();

        $this->assertSame(1, $owner->fresh()->tokens()->count());
    }

    public function test_profile_page_includes_extension_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        );

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Profile/Edit')
                ->has('extensionTokens', 1)
                ->where('extensionTokenPlain', null)
            );
    }
}
