<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingCreditsTest extends TestCase
{
    use RefreshDatabase;

    public function test_credits_route_flashes_coming_soon_when_price_unset(): void
    {
        config(['cashier.credits_price_id' => null]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->get(route('billing.credits'))
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('error', 'AI credit packs coming soon');
    }

    public function test_credits_route_refuses_non_subscribers_when_price_set(): void
    {
        config(['cashier.credits_price_id' => 'price_test_credits']);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->get(route('billing.credits'))
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('error', 'Subscribe to purchase AI credits');
    }
}
