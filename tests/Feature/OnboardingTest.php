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

    public function test_wizard_page_renders_for_new_user(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)
            ->get(route('onboarding.show'))
            ->assertInertia(fn ($page) => $page
                ->component('Onboarding/Wizard')
                ->has('allTemplates', 4)
                ->has('allowedTemplates', 4)
            );
    }

    public function test_already_onboarded_user_is_redirected_to_dashboard(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);

        $this->actingAs($user)
            ->get(route('onboarding.show'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_post_saves_career_context_fields(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'target_role' => 'Senior Engineer',
            'industry' => 'Technology',
            'years_experience' => 8,
        ]);

        $user->refresh();
        $this->assertEquals('Senior Engineer', $user->target_role);
        $this->assertEquals('Technology', $user->industry);
        $this->assertEquals(8, $user->years_experience);
    }

    public function test_post_saves_contact_info_to_profile_json(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'full_name' => 'Jane Doe',
            'phone' => '555-1234',
            'location' => 'Austin, TX',
            'linkedin_url' => 'https://linkedin.com/in/janedoe',
            'website' => 'https://janedoe.com',
        ]);

        $user->refresh();
        $this->assertEquals('Jane Doe', $user->profile['full_name']);
        $this->assertEquals('555-1234', $user->profile['phone']);
        $this->assertEquals('Austin, TX', $user->profile['location']);
        $this->assertEquals('https://linkedin.com/in/janedoe', $user->profile['linkedin_url']);
        $this->assertEquals('https://janedoe.com', $user->profile['website']);
    }

    public function test_post_saves_valid_preferred_template(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'preferred_template' => 'modern',
        ]);

        $this->assertEquals('modern', $user->fresh()->preferred_template);
    }

    public function test_post_rejects_invalid_preferred_template(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'preferred_template' => 'not-a-real-template',
        ])->assertSessionHasErrors('preferred_template');
    }

    public function test_post_leaves_preferred_template_null_when_omitted(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), []);

        $this->assertNull($user->fresh()->preferred_template);
    }

    public function test_post_rejects_retired_preferred_template(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'preferred_template' => 'bold',
        ])->assertSessionHasErrors('preferred_template');
    }

    public function test_post_sets_has_completed_onboarding_true(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)->post(route('onboarding.store'), [
            'target_role' => 'Designer',
        ]);

        $this->assertTrue($user->fresh()->has_completed_onboarding);
    }

    public function test_post_redirects_to_dashboard(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);

        $this->actingAs($user)
            ->post(route('onboarding.store'), [])
            ->assertRedirect(route('dashboard'));
    }

    public function test_registration_redirects_to_onboarding(): void
    {
        $response = $this->post(route('register'), [
            'name' => 'Test User',
            'email' => 'newuser@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('onboarding.show'));
    }
}
