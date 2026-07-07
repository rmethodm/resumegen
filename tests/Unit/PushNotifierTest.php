<?php

namespace Tests\Unit;

use App\Models\DeviceToken;
use App\Models\User;
use App\Services\PushNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PushNotifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_a_push_request_per_registered_device(): void
    {
        Http::fake(['exp.host/*' => Http::response(['data' => 'ok'])]);
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[a]']);
        DeviceToken::factory()->for($user)->create(['expo_push_token' => 'ExponentPushToken[b]']);

        PushNotifier::notify($user, 'Title', 'Body', ['thread_id' => 1]);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && collect($request->data())->pluck('to')->contains('ExponentPushToken[a]')
                && collect($request->data())->pluck('to')->contains('ExponentPushToken[b]');
        });
    }

    public function test_does_nothing_when_user_has_no_device_tokens(): void
    {
        Http::fake();
        $user = User::factory()->create();

        PushNotifier::notify($user, 'Title', 'Body');

        Http::assertNothingSent();
    }

    public function test_swallows_connection_failures(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Could not connect');
        });
        $user = User::factory()->create();
        DeviceToken::factory()->for($user)->create();

        // Must not throw.
        PushNotifier::notify($user, 'Title', 'Body');
        $this->assertTrue(true);
    }
}
