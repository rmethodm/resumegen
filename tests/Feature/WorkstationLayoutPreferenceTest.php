<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkstationLayoutPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_workstation_layout(): void
    {
        $user = User::factory()->create(['workstation_layout' => 'tabs']);

        $response = $this->actingAs($user)->patch(route('workstation-layout.update'), [
            'workstation_layout' => 'hybrid',
        ]);

        $response->assertRedirect();
        $this->assertSame('hybrid', $user->fresh()->workstation_layout);
    }

    public function test_workstation_layout_must_be_a_known_value(): void
    {
        $user = User::factory()->create(['workstation_layout' => 'tabs']);

        $response = $this->actingAs($user)->patch(route('workstation-layout.update'), [
            'workstation_layout' => 'not-a-real-mode',
        ]);

        $response->assertSessionHasErrors('workstation_layout');
        $this->assertSame('tabs', $user->fresh()->workstation_layout);
    }

    public function test_new_users_default_to_tabs_layout(): void
    {
        $user = User::factory()->create();

        $this->assertSame('tabs', $user->workstation_layout);
    }
}
