<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_a_valid_theme(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch('/user/theme', ['theme' => 'claude']);

        $response->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame('claude', $user->fresh()->theme);
    }

    public function test_user_can_reset_theme_to_default(): void
    {
        $user = User::factory()->create(['theme' => 'claude']);

        $response = $this->actingAs($user)->patch('/user/theme', ['theme' => null]);

        $response->assertSessionHasNoErrors()->assertRedirect();
        $this->assertNull($user->fresh()->theme);
    }

    public function test_invalid_theme_id_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch('/user/theme', ['theme' => 'not-a-real-theme']);

        $response->assertSessionHasErrors('theme');
        $this->assertNull($user->fresh()->theme);
    }
}
