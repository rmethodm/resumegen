<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class AiCreditsSharedPropTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    public function test_guests_receive_null_ai_credits(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Welcome')
                ->where('aiCredits', null));
    }

    public function test_authenticated_pages_include_ai_credits(): void
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, 7, 'admin');

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('aiCredits', fn ($credits) => $credits
                    ->where('balance', 7)
                    ->where('subscribed', true)
                    ->where('canPurchase', true)
                    ->etc()));
    }

    public function test_blocked_subscriber_cannot_purchase_credits(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, 3, 'admin');

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('aiCredits.balance', 3)
                ->where('aiCredits.subscribed', true)
                ->where('aiCredits.canPurchase', false));
    }
}
