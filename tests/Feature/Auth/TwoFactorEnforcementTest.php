<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_pro_user_without_2fa_redirected_from_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('profile.edit'));
    }

    public function test_pro_user_without_2fa_can_access_profile(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk();
    }

    public function test_pro_user_with_2fa_enabled_can_access_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_free_user_without_2fa_can_access_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => false,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_user_with_pending_2fa_challenge_redirected_to_challenge_page(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->get(route('dashboard'))
            ->assertRedirect(route('two-factor.challenge'));
    }

    public function test_pro_user_without_2fa_can_access_logout(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('logout'))
            ->assertRedirect('/');
    }
}
