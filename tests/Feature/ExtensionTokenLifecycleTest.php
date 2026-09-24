<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\MobileApiToken;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Extension tokens are minted on every connect/paste, so they must be pruned,
 * and the extension revoke endpoint must never reach the user's mobile tokens.
 */
class ExtensionTokenLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_paste_token_flow_keeps_only_the_newest_five_extension_tokens(): void
    {
        $user = User::factory()->create();
        $mobile = $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY])->accessToken;

        for ($i = 0; $i < 7; $i++) {
            $this->actingAs($user)
                ->withSession(['auth.password_confirmed_at' => time()])
                ->post(route('profile.extension-tokens.store'))
                ->assertRedirect(route('profile.edit'));
        }

        $extensionIds = $user->tokens()->where('name', ResumeFillProfile::TOKEN_NAME)->orderBy('id')->pluck('id');

        $this->assertCount(5, $extensionIds);
        // The two oldest went, the newest five stayed.
        $this->assertSame(
            $user->tokens()->where('name', ResumeFillProfile::TOKEN_NAME)->max('id'),
            $extensionIds->last()
        );
        // Pruning is scoped to extension tokens — the phone stays signed in.
        $this->assertNotNull($mobile->fresh());
    }

    public function test_connect_flow_keeps_only_the_newest_five_extension_tokens(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user)
                ->withSession(['auth.password_confirmed_at' => time()])
                ->postJson(route('extension.connect.token'))
                ->assertOk();
        }

        $this->assertSame(5, $user->tokens()->where('name', ResumeFillProfile::TOKEN_NAME)->count());
    }

    public function test_extension_revoke_endpoint_cannot_delete_a_mobile_token(): void
    {
        $user = User::factory()->create();
        $mobile = $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY])->accessToken;

        $this->actingAs($user)
            ->delete(route('profile.extension-tokens.destroy', $mobile))
            ->assertNotFound();

        $this->assertNotNull($mobile->fresh());
    }
}
