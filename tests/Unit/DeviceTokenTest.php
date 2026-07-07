<?php

namespace Tests\Unit;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_token_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $token = DeviceToken::factory()->for($user)->create();

        $this->assertTrue($token->user->is($user));
    }

    public function test_user_has_many_device_tokens(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->count(2)->create();

        $this->assertCount(2, $user->deviceTokens);
    }

    public function test_expo_push_token_is_unique(): void
    {
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[dup]']);

        $this->expectException(QueryException::class);
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[dup]']);
    }
}
