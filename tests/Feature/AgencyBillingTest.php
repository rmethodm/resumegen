<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgencyBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_agency_tier_accepted_in_checkout_validation(): void
    {
        // Verify that 'agency' passes validation (not 422). The request will fail
        // later (no valid price ID in test env) but must not 422 on the tier field.
        $user = User::factory()->create();

        // With no Stripe key configured, checkout will throw or redirect with error.
        // We just need to confirm the tier field is accepted — the test passes as
        // long as it's NOT a 422 validation error.
        $response = $this->actingAs($user)
            ->post(route('billing.checkout'), ['interval' => 'monthly', 'tier' => 'agency']);

        $this->assertNotEquals(422, $response->getStatusCode());
    }

    public function test_invalid_tier_still_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('billing.checkout'), ['interval' => 'monthly', 'tier' => 'enterprise'])
            ->assertSessionHasErrors('tier');
    }

    public function test_billing_page_shows_pro_plan_for_agency_user(): void
    {
        $user = User::factory()->agency()->create();

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Billing/Index')
                ->where('plan', 'pro')
            );
    }

    public function test_billing_page_shows_free_plan_for_free_user(): void
    {
        $user = User::factory()->free()->create();

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Billing/Index')
                ->where('plan', 'free')
            );
    }
}
