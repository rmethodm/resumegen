<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordSessionHardeningTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A reset or change elsewhere must evict a session that was opened with
     * the old password — otherwise changing a compromised password does not
     * lock the attacker out.
     */
    public function test_session_is_evicted_after_password_changes_elsewhere(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $user->forceFill(['password' => Hash::make('changed-elsewhere')])->save();

        $this->get(route('dashboard'))->assertRedirect('/login');
        $this->assertGuest();
    }

    /**
     * The user who changes their own password must stay signed in on the
     * device they changed it from.
     */
    public function test_own_password_change_keeps_current_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $this->from('/profile')->put(route('password.change'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertSessionHasNoErrors();

        $this->get(route('dashboard'))->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_password_change_rejects_rapid_current_password_guessing(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user)->from('/profile')->put(route('password.change'), [
                'current_password' => 'guess-'.$i,
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])->assertSessionHasErrors('current_password');
        }

        $this->actingAs($user)->put(route('password.change'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(429);

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_password_confirmation_rejects_rapid_guessing(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user)->post(route('password.confirm.store'), [
                'password' => 'guess-'.$i,
            ])->assertSessionHasErrors('password');
        }

        $this->actingAs($user)->post(route('password.confirm.store'), [
            'password' => 'password',
        ])->assertStatus(429);
    }

    /**
     * Unthrottled, the reset-link endpoint lets anyone flood a victim's inbox.
     */
    public function test_password_reset_link_requests_are_throttled(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post(route('password.email'), ['email' => 'nobody@example.com']);
        }

        $this->post(route('password.email'), ['email' => 'nobody@example.com'])
            ->assertStatus(429);
    }

    /**
     * The email|IP key alone lets one address try every email at 5/min each;
     * the per-IP cap stops that credential-stuffing spray.
     */
    public function test_login_is_capped_per_ip_across_different_emails(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->post('/login', [
                'email' => "victim{$i}@example.com",
                'password' => 'wrong-password',
            ])->assertSessionHasErrors('email');
        }

        $this->post('/login', [
            'email' => 'victim-next@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }
}
