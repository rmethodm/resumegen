<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonaProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_persona_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.persona'), [
                'full_name' => 'Jane Smith',
                'email' => 'jane@example.com',
                'phone' => '+1 555 000 0000',
                'location' => 'San Francisco, CA',
                'linkedin_url' => 'https://linkedin.com/in/janesmith',
                'website' => '',
            ])
            ->assertRedirect(route('profile.edit'));

        $this->assertSame('Jane Smith', $user->fresh()->profile['full_name']);
        $this->assertSame('jane@example.com', $user->fresh()->profile['email']);
    }

    public function test_persona_profile_fields_are_all_nullable(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.persona'), [])
            ->assertRedirect(route('profile.edit'));
    }

    public function test_linkedin_url_must_be_valid_url(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.persona'), ['linkedin_url' => 'not-a-url'])
            ->assertSessionHasErrors('linkedin_url');
    }

    public function test_new_resume_contact_is_prefilled_from_profile(): void
    {
        $user = User::factory()->create([
            'profile' => [
                'full_name' => 'Jane Smith',
                'email' => 'jane@example.com',
                'phone' => '+1 555 000 0000',
                'location' => 'San Francisco, CA',
                'linkedin_url' => '',
                'website' => '',
            ],
        ]);

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'My Resume'])
            ->assertRedirect();

        $resume = $user->resumes()->first();
        $this->assertSame('Jane Smith', $resume->contact['full_name']);
        $this->assertSame('jane@example.com', $resume->contact['email']);
    }

    public function test_new_resume_contact_is_not_prefilled_when_profile_is_null(): void
    {
        $user = User::factory()->create(['profile' => null]);

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'My Resume'])
            ->assertRedirect();

        $resume = $user->resumes()->first();
        $this->assertNull($resume->contact);
    }

    public function test_profile_card_is_rendered_in_profile_edit(): void
    {
        $user = User::factory()->create([
            'profile' => ['full_name' => 'Jane Smith', 'email' => 'jane@example.com'],
        ]);

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertInertia(fn ($page) => $page->has('profile'));
    }
}
