<?php

namespace Tests\Feature;

use App\Models\StarterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StarterProfileAutofillTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Regression test: leaving any optional field blank (which becomes null
     * via ConvertEmptyStringsToNull, same as a real browser submit) used to
     * 500 on the starter_profiles NOT NULL columns and silently discard the
     * whole save — see StarterProfileController::update().
     */
    public function test_starter_profile_saves_with_optional_fields_left_blank(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Jane Doe',
            'target_role' => 'Software Engineer',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'headline' => '',
            'email' => '',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('starter-profile.edit'));

        $profile = $user->fresh()->starterProfile;

        $this->assertNotNull($profile, 'starter profile was not saved');
        $this->assertSame('Jane Doe', $profile->full_name);
        $this->assertSame('Software Engineer', $profile->target_role);
        $this->assertSame('', $profile->phone);
        $this->assertSame('', $profile->linkedin);
    }

    public function test_new_resume_autofills_contact_info_and_experience_from_starter_profile(): void
    {
        $user = User::factory()->create();

        StarterProfile::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'Jane Doe',
            'headline' => 'Senior Engineer',
            'target_role' => 'Engineer',
            'experience_snapshot' => [[
                'title' => 'Developer',
                'company' => 'Acme',
                'start_date' => '2020',
                'end_date' => '2022',
                'is_current' => false,
                'bullets' => ['Shipped things'],
            ]],
            'skills' => [['category' => 'Languages', 'name' => 'PHP']],
        ]);

        $this->actingAs($user)->post(route('resumes.store'));

        $resume = $user->resumes()->latest()->first();

        $this->assertSame('Jane Doe', $resume->full_name);
        $this->assertSame('Senior Engineer', $resume->headline);
        $this->assertSame('Engineer', $resume->target_role);
        $this->assertSame(1, $resume->experiences()->count());
        $this->assertSame('Developer', $resume->experiences()->first()->title);
        $this->assertSame(1, $resume->skills()->count());
    }

    /**
     * End-to-end: fill the intake form with a blank optional field the way a
     * real user would, then confirm the very next resume created is seeded
     * from it. This is the exact path that was broken.
     */
    public function test_end_to_end_intake_with_blank_field_then_new_resume_autofills(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Jane Doe',
            'target_role' => 'Software Engineer',
            'phone' => '',
        ]);

        $this->actingAs($user)->post(route('resumes.store'));

        $resume = $user->resumes()->latest()->first();

        $this->assertSame('Jane Doe', $resume->full_name);
        $this->assertSame('Software Engineer', $resume->target_role);
    }
}
