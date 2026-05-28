<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_mark_onboarding_complete(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $response = $this
            ->actingAs($user)
            ->patch(route('onboarding.complete'));

        $response->assertRedirect();
        $this->assertTrue($user->fresh()->has_completed_onboarding);
    }

    public function test_guest_cannot_mark_onboarding_complete(): void
    {
        $this->patch(route('onboarding.complete'))
            ->assertRedirect(route('login'));
    }

    public function test_endpoint_is_idempotent(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);

        $this->actingAs($user)
            ->patch(route('onboarding.complete'))
            ->assertRedirect();

        $this->assertTrue($user->fresh()->has_completed_onboarding);
    }
}
