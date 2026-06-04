<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonalTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_token(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/profile/tokens');
        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'name', 'created_at', 'plain_text_token']);
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'Browser Extension',
        ]);
    }

    public function test_authenticated_user_can_revoke_own_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('Browser Extension');
        $tokenId = $token->accessToken->id;
        $response = $this->actingAs($user)->deleteJson("/profile/tokens/{$tokenId}");
        $response->assertNoContent();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }

    public function test_user_cannot_revoke_another_users_token(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $other->createToken('Browser Extension');
        $tokenId = $token->accessToken->id;
        $this->actingAs($user)->deleteJson("/profile/tokens/{$tokenId}")->assertNoContent();
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $tokenId]);
    }

    public function test_guest_cannot_create_token(): void
    {
        $this->postJson('/profile/tokens')->assertUnauthorized();
    }

    public function test_profile_edit_passes_tokens_prop(): void
    {
        $user = User::factory()->create();
        $user->createToken('Browser Extension');
        $response = $this->actingAs($user)->get('/profile');
        $response->assertInertia(fn ($page) => $page
            ->component('Profile/Edit')
            ->has('tokens', 1)
        );
    }
}
