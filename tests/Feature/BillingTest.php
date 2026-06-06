<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Cashier\Subscription;
use Laravel\Cashier\SubscriptionItem;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_billing_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Billing/Index'));
    }

    public function test_guest_cannot_view_billing_page(): void
    {
        $this->get(route('billing.index'))
            ->assertRedirect(route('login'));
    }

    public function test_free_user_at_limit_is_redirected_when_creating_resume(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $user->resumes()->create(['name' => "Resume $i", 'pdf_filename' => "$i.pdf"]);
        }

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'Sixth Resume'])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'resume_limit');
    }

    public function test_free_user_under_limit_can_create_resume(): void
    {
        $user = User::factory()->create();
        $user->resumes()->create(['name' => 'Existing', 'pdf_filename' => 'e.pdf']);

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'New Resume'])
            ->assertRedirect();

        $this->assertSame(2, $user->resumes()->count());
    }

    public function test_billing_page_passes_free_plan_data_for_unsubscribed_user(): void
    {
        $user = User::factory()->create();
        $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->where('plan', 'free')
                ->where('resumeCount', 1)
                ->where('resumeLimit', 5)
            );
    }

    public function test_billing_page_passes_starter_plan_data(): void
    {
        $user = User::factory()->starter()->create();
        $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->where('plan', 'starter')
                ->where('resumeLimit', 5)
            );
    }

    public function test_billing_page_passes_pro_plan_data(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->where('plan', 'pro')
                ->where('resumeLimit', null)
            );
    }

    public function test_checkout_requires_tier_param(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('billing.checkout'), ['interval' => 'monthly'])
            ->assertSessionHasErrors('tier');
    }

    public function test_subscription_observer_sets_plan_tier_on_active(): void
    {
        config([
            'services.stripe.starter_monthly_price_id' => 'price_starter_monthly_test',
            'services.stripe.starter_yearly_price_id' => 'price_starter_yearly_test',
            'services.stripe.pro_monthly_price_id' => 'price_pro_monthly_test',
            'services.stripe.pro_yearly_price_id' => 'price_pro_yearly_test',
        ]);

        $user = User::factory()->create(['plan_tier' => 'free']);

        $subscription = new Subscription([
            'user_id' => $user->id,
            'type' => 'default',
            'stripe_id' => 'sub_test_'.uniqid(),
            'stripe_status' => 'active',
        ]);
        $subscription->save();

        $item = new SubscriptionItem([
            'subscription_id' => $subscription->id,
            'stripe_id' => 'si_test_'.uniqid(),
            'stripe_product' => 'prod_test_starter',
            'stripe_price' => 'price_starter_monthly_test',
            'quantity' => 1,
        ]);
        $item->save();

        // Simulate the observer by touching (triggers the saved event again)
        $subscription->touch();

        $this->assertSame('starter', $user->fresh()->plan_tier);
    }

    public function test_subscription_observer_resets_to_free_on_cancel(): void
    {
        $user = User::factory()->starter()->create();

        $subscription = new Subscription([
            'user_id' => $user->id,
            'type' => 'default',
            'stripe_id' => 'sub_test_'.uniqid(),
            'stripe_status' => 'canceled',
        ]);
        $subscription->save();

        $this->assertSame('free', $user->fresh()->plan_tier);
    }
}
