<?php

namespace Tests\Feature\Api;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PushTokenTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_guest_cannot_register_push_token(): void
    {
        $this->postJson('/api/push-tokens', [
            'expo_push_token' => 'ExponentPushToken[abc]',
            'platform' => 'ios',
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_register_push_token(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/push-tokens', [
                'expo_push_token' => 'ExponentPushToken[abc]',
                'platform' => 'ios',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('device_tokens', [
            'user_id' => $user->id,
            'expo_push_token' => 'ExponentPushToken[abc]',
            'platform' => 'ios',
        ]);
    }

    public function test_registering_same_token_twice_upserts_instead_of_duplicating(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->withToken($this->token($userA))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'platform' => 'ios']);

        $this->withToken($this->token($userB))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'platform' => 'ios'])
            ->assertCreated();

        $this->assertDatabaseCount('device_tokens', 1);
        $this->assertDatabaseHas('device_tokens', ['expo_push_token' => 'ExponentPushToken[shared]', 'user_id' => $userB->id]);
    }

    public function test_platform_must_be_ios_or_android(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[abc]', 'platform' => 'windows'])
            ->assertStatus(422);
    }

    public function test_user_can_delete_their_own_device_token(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[mine]']);

        $this->withToken($this->token($user))
            ->deleteJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[mine]'])
            ->assertNoContent();

        $this->assertDatabaseCount('device_tokens', 0);
    }

    public function test_deleting_a_token_does_not_affect_other_users_tokens(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        DeviceToken::factory()->for($owner)->create(['expo_push_token' => 'ExponentPushToken[owner]']);

        $this->withToken($this->token($other))
            ->deleteJson('/api/push-tokens', ['expo_push_token' => 'ExponentPushToken[owner]'])
            ->assertNoContent();

        $this->assertDatabaseCount('device_tokens', 1);
    }
}
