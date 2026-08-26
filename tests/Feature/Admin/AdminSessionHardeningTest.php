<?php

namespace Tests\Feature\Admin;

use App\Http\Middleware\EnforceAdminSessionIdleTimeout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AdminSessionHardeningTest extends TestCase
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

    public function test_admin_idle_timeout_logs_out_and_redirects_to_login(): void
    {
        Config::set('app.admin_session_lifetime', 60);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->withSession([
                EnforceAdminSessionIdleTimeout::SESSION_KEY => time() - (61 * 60),
            ])
            ->get($this->adminUrl('/'))
            ->assertRedirect($this->adminUrl('/login'))
            ->assertSessionHas('error');

        $this->assertGuest();
    }

    public function test_admin_activity_within_lifetime_is_allowed_and_timestamp_refreshed(): void
    {
        Config::set('app.admin_session_lifetime', 60);
        $admin = User::factory()->admin()->create();
        $staleButValid = time() - (10 * 60);

        $this->actingAs($admin)
            ->withSession([
                EnforceAdminSessionIdleTimeout::SESSION_KEY => $staleButValid,
            ])
            ->get($this->adminUrl('/'))
            ->assertOk();

        $this->assertAuthenticatedAs($admin);
        $this->assertGreaterThanOrEqual($staleButValid, (int) session(EnforceAdminSessionIdleTimeout::SESSION_KEY));
        $this->assertGreaterThan($staleButValid, (int) session(EnforceAdminSessionIdleTimeout::SESSION_KEY));
    }

    public function test_product_host_ignores_stale_admin_idle_timestamp(): void
    {
        Config::set('app.admin_session_lifetime', 60);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->withSession([
                EnforceAdminSessionIdleTimeout::SESSION_KEY => time() - (24 * 60 * 60),
            ])
            ->get(route('profile.edit'))
            ->assertOk();

        $this->assertAuthenticatedAs($admin);
    }

    public function test_admin_login_is_throttled_after_three_failed_attempts(): void
    {
        RateLimiter::clear('admin-login|'.mb_strtolower('throttle-admin@example.com').'|127.0.0.1');

        $admin = User::factory()->admin()->create([
            'email' => 'throttle-admin@example.com',
            'password' => bcrypt('password'),
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->post($this->adminUrl('/login'), [
                'email' => $admin->email,
                'password' => 'wrong-password',
            ])->assertRedirect();
        }

        $this->post($this->adminUrl('/login'), [
            'email' => $admin->email,
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_product_login_still_allows_five_attempts_per_minute(): void
    {
        RateLimiter::clear(mb_strtolower('throttle-product@example.com').'|127.0.0.1');

        $user = User::factory()->create([
            'email' => 'throttle-product@example.com',
            'password' => bcrypt('password'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertRedirect();
        }

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }
}
