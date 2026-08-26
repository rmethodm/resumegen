<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function adminHost(): string
    {
        return (string) config('app.admin_domain');
    }

    private function adminUrl(string $path = '/'): string
    {
        return 'http://'.$this->adminHost().$path;
    }

    public function test_guest_is_redirected_from_admin_dashboard(): void
    {
        $this->get($this->adminUrl('/'))
            ->assertRedirect();
    }

    public function test_guest_admin_redirect_stays_on_admin_host(): void
    {
        $this->get($this->adminUrl('/'))
            ->assertRedirect($this->adminUrl('/login'));
    }

    public function test_admin_login_on_admin_host_lands_on_admin_dashboard_after_2fa(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $admin = User::factory()->admin()->create([
            'password' => bcrypt('password'),
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->post($this->adminUrl('/login'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('two-factor.challenge'));

        $this->assertAuthenticatedAs($admin);
        $this->assertTrue(session('two_factor_auth_pending'));

        $this->post($this->adminUrl('/two-factor-challenge'), [
            'code' => $google2fa->getCurrentOtp($secret),
        ])->assertRedirect(); // admin host root (with or without trailing slash)

        $this->get($this->adminUrl('/'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Dashboard'));
    }

    public function test_admin_without_2fa_cannot_login_on_admin_host(): void
    {
        $admin = User::factory()->admin()->create([
            'password' => bcrypt('password'),
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ]);

        $this->post($this->adminUrl('/login'), [
            'email' => $admin->email,
            'password' => 'password',
        ])
            ->assertRedirect($this->adminUrl('/login'))
            ->assertSessionHas('error');

        $this->assertGuest();
    }

    public function test_admin_without_2fa_cannot_access_admin_dashboard(): void
    {
        $admin = User::factory()->admin()->create([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ]);

        $this->actingAs($admin)
            ->get($this->adminUrl('/'))
            ->assertRedirect($this->adminUrl('/login'))
            ->assertSessionHas('error');

        $this->assertGuest();
    }

    public function test_non_admin_login_on_admin_host_is_rejected(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        $this->post($this->adminUrl('/login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect($this->adminUrl('/login'))
            ->assertSessionHas('error');

        $this->assertGuest();
    }

    public function test_non_admin_cannot_access_admin_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminUrl('/'))
            ->assertForbidden();
    }

    public function test_admin_on_main_host_does_not_serve_admin_dashboard_at_root(): void
    {
        $admin = User::factory()->admin()->create();

        // Main app root is the public welcome page, not the admin dashboard.
        $this->actingAs($admin)
            ->get('http://resumegen.test/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Welcome'));
    }

    public function test_admin_on_admin_host_sees_dashboard(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminUrl('/'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->has('users_count')
                ->has('signups_last_7_days')
                ->has('disabled_count'));
    }
}
