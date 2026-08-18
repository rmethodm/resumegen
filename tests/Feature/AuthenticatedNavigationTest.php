<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Core product destinations must stay reachable for authenticated users.
 * Global nav links these routes (Shares, Jobs, Applications).
 */
class AuthenticatedNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_app_destinations_are_reachable(): void
    {
        $user = User::factory()->create();

        // resumes.index is the Resumes nav destination (template catalogue).
        $this->actingAs($user)->get(route('dashboard'))->assertOk();
        $this->actingAs($user)
            ->get(route('resumes.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Index')
                ->has('templates', 4)
                ->where('templates', ['ats-plain', 'classic', 'modern', 'minimalist']));
        $this->actingAs($user)->get(route('shares.index'))->assertOk();
        $this->actingAs($user)->get(route('jobs-imports.index'))->assertOk();
        $this->actingAs($user)->get(route('job-applications.index'))->assertOk();
        $this->actingAs($user)->get(route('profile.edit'))->assertOk();
    }
}
