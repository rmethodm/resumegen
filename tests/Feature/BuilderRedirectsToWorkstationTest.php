<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderRedirectsToWorkstationTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_builder_edit_redirects_to_workstation(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.edit', $resume))
            ->assertRedirect(route('resumes.workstation', $resume));
    }

    public function test_legacy_builder_index_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_legacy_builder_create_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('builder.create'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_strangers_cannot_open_legacy_builder_edit(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->get(route('builder.edit', $resume))
            ->assertForbidden();
    }
}
