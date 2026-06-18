<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('onboarding.show', absolute: false));
    }

    public function test_registration_stores_ip(): void
    {
        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com', 'registration_ip' => '127.0.0.1']);
    }

    public function test_ip_velocity_blocks_sixth_registration(): void
    {
        User::factory()->count(5)->create(['registration_ip' => '1.2.3.4']);

        $this->withServerVariables(['REMOTE_ADDR' => '1.2.3.4'])
            ->post('/register', [
                'name' => 'Attacker',
                'email' => 'attacker@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertSessionHasErrors('registration');
    }

    public function test_ip_velocity_allows_fifth_registration(): void
    {
        User::factory()->count(4)->create(['registration_ip' => '1.2.3.4']);

        $this->withServerVariables(['REMOTE_ADDR' => '1.2.3.4'])
            ->post('/register', [
                'name' => 'Legit',
                'email' => 'legit@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertRedirect(route('onboarding.show', absolute: false));
    }
}
