<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplyWizardTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_prefer_the_wizard_and_have_not_dismissed_the_checklist(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($user->fresh()->prefers_apply_wizard);
        $this->assertNull($user->fresh()->dismissed_checklist_at);
    }

    public function test_wizard_renders_with_resume_options(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create(['title' => 'Base']);

        $this->actingAs($user)
            ->get(route('apply.wizard'))
            ->assertInertia(fn ($page) => $page
                ->component('Apply/Wizard')
                ->has('resumeOptions', 1)
                ->where('resumeOptions.0.title', 'Base'));
    }

    public function test_preference_endpoint_toggles_wizard(): void
    {
        $user = User::factory()->create(['prefers_apply_wizard' => true]);

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => false])
            ->assertRedirect();
        $this->assertFalse($user->fresh()->prefers_apply_wizard);

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => true])
            ->assertRedirect();
        $this->assertTrue($user->fresh()->prefers_apply_wizard);
    }

    public function test_preference_endpoint_requires_boolean(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => 'maybe'])
            ->assertSessionHasErrors('prefers_apply_wizard');
    }

    public function test_guest_cannot_open_the_wizard(): void
    {
        $this->get(route('apply.wizard'))->assertRedirect(route('login'));
    }
}
