<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DisabledUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_disabled_user_cannot_log_in(): void
    {
        $user = User::factory()->disabled()->create([
            'password' => Hash::make('password'),
        ]);

        $this->from('/login')->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_disabled_user_session_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $user->forceFill(['disabled_at' => now()])->save();

        $this->get(route('dashboard'))
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }
}
