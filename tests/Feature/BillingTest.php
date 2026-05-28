<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->assertRedirect(route('billing.index'));
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
}
