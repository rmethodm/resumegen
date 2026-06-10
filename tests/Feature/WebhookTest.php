<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WebhookEndpoint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_user_can_create_webhook(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->postJson(route('webhooks.store'), [
            'url' => 'https://example.com/webhook',
            'events' => ['resume.updated'],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('webhook_endpoints', [
            'url' => 'https://example.com/webhook',
            'user_id' => $user->id,
        ]);
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->free()->create();

        $response = $this->actingAs($user)->postJson(route('webhooks.store'), [
            'url' => 'https://example.com/hook',
            'events' => ['resume.updated'],
        ]);

        $response->assertStatus(402);
    }

    public function test_invalid_url_returns_422(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->postJson(route('webhooks.store'), [
            'url' => 'not-a-url',
            'events' => ['resume.updated'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['url']);
    }

    public function test_invalid_event_returns_422(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->postJson(route('webhooks.store'), [
            'url' => 'https://example.com/hook',
            'events' => ['fake.event'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['events.0']);
    }

    public function test_starter_user_can_delete_own_endpoint(): void
    {
        $user = User::factory()->starter()->create();
        $endpoint = WebhookEndpoint::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->deleteJson(route('webhooks.destroy', $endpoint));

        $response->assertNoContent();
        $this->assertModelMissing($endpoint);
    }

    public function test_user_cannot_delete_another_users_endpoint(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $endpoint = WebhookEndpoint::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->deleteJson(route('webhooks.destroy', $endpoint));

        $response->assertForbidden();
    }

    public function test_cannot_register_webhook_to_private_ip(): void
    {
        $user = User::factory()->starter()->create();

        $this->actingAs($user)
            ->postJson(route('webhooks.store'), [
                'url' => 'http://169.254.169.254/latest/meta-data/',
                'events' => ['resume.created'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }

    public function test_cannot_register_webhook_to_localhost(): void
    {
        $user = User::factory()->starter()->create();

        $this->actingAs($user)
            ->postJson(route('webhooks.store'), [
                'url' => 'http://localhost:6379',
                'events' => ['resume.created'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }

    public function test_cannot_register_webhook_to_internal_10_range(): void
    {
        $user = User::factory()->starter()->create();

        $this->actingAs($user)
            ->postJson(route('webhooks.store'), [
                'url' => 'http://10.0.0.1/internal',
                'events' => ['resume.created'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }
}
