<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_mobile_token(): void
    {
        $this->post(route('profile.mobile-tokens.store'))
            ->assertRedirect(route('login'));
    }

    public function test_user_can_create_and_revoke_mobile_token(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('profile.mobile-tokens.store'))
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('mobile_token_plain')
            ->assertSessionHas('status', 'mobile-token-created');

        $this->assertSame(1, $user->tokens()->count());
        $token = $user->tokens()->first();
        $this->assertSame(MobileApiToken::TOKEN_NAME, $token->name);
        $this->assertTrue($token->can(MobileApiToken::TOKEN_ABILITY));

        $this->actingAs($user)
            ->delete(route('profile.mobile-tokens.destroy', $token))
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('status', 'mobile-token-revoked');

        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    public function test_creating_token_requires_password_confirmation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.mobile-tokens.store'))
            ->assertRedirect(route('password.confirm'));

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_user_cannot_revoke_another_users_token(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $token = $owner->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        )->accessToken;

        $this->actingAs($other)
            ->delete(route('profile.mobile-tokens.destroy', $token))
            ->assertNotFound();

        $this->assertSame(1, $owner->fresh()->tokens()->count());
    }

    public function test_profile_page_includes_mobile_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        );

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Profile/Edit')
                ->has('mobileTokens', 1)
                ->where('mobileTokenPlain', null)
            );
    }
}
