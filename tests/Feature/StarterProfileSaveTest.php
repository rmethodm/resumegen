<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StarterProfileSaveTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_profile_scalars_save_without_skills(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Ada Lovelace',
            'headline' => 'Mathematician',
            'email' => 'ada@example.com',
            'phone' => '(415) 555-0100',
            'location' => 'London',
            'target_role' => 'Analyst',
            'linkedin' => 'https://linkedin.com/in/ada',
            'website' => 'https://ada.dev',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('starter-profile.edit'));

        $profile = $user->fresh()->starterProfile;

        $this->assertNotNull($profile);
        $this->assertSame('Ada Lovelace', $profile->full_name);
        $this->assertSame('Mathematician', $profile->headline);
        $this->assertSame('ada@example.com', $profile->email);
    }

    /**
     * Blank skill rows used to fail skills.*.name required validation while the
     * UI showed no skill error — Save looked successful, then reload lost scalars.
     */
    public function test_blank_skill_row_does_not_block_scalar_save(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Ada Lovelace',
            'headline' => 'Mathematician',
            'email' => 'ada@example.com',
            'phone' => '(415) 555-0100',
            'location' => 'London',
            'target_role' => 'Analyst',
            'linkedin' => 'https://linkedin.com/in/ada',
            'website' => 'https://ada.dev',
            'skills' => [
                ['name' => '', 'category' => ''],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('starter-profile.edit'));

        $profile = $user->fresh()->starterProfile;

        $this->assertNotNull($profile, 'starter profile was not saved');
        $this->assertSame('Ada Lovelace', $profile->full_name);
        $this->assertSame([], $profile->skills ?? []);
    }

    public function test_blank_experience_row_does_not_block_scalar_save(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Ada Lovelace',
            'target_role' => 'Analyst',
            'experience_snapshot' => [[
                'title' => '',
                'company' => '',
                'start_date' => '',
                'end_date' => '',
                'is_current' => '0',
                'bullets' => [''],
            ]],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('starter-profile.edit'));

        $profile = $user->fresh()->starterProfile;

        $this->assertNotNull($profile);
        $this->assertSame('Ada Lovelace', $profile->full_name);
    }

    public function test_named_skills_are_persisted(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('starter-profile.update'), [
            'full_name' => 'Ada Lovelace',
            'skills' => [
                ['name' => 'PHP', 'category' => 'Languages'],
                ['name' => '', 'category' => ''],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $profile = $user->fresh()->starterProfile;

        $this->assertEqualsCanonicalizing(
            [['category' => 'Languages', 'name' => 'PHP']],
            $profile->skills,
        );
    }
}
