<?php

namespace Tests\Feature\Admin;

use App\Models\SiteVisit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitorControllerTest extends TestCase
{
    use RefreshDatabase;

    private function adminPath(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_guest_is_redirected_from_visitors(): void
    {
        $this->get($this->adminPath('/visitors'))->assertRedirect();
    }

    public function test_non_admin_cannot_view_visitors(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminPath('/visitors'))
            ->assertForbidden();
    }

    public function test_admin_can_view_visitors_page(): void
    {
        $admin = User::factory()->admin()->create();
        SiteVisit::create([
            'method' => 'GET',
            'path' => '/dashboard',
            'ip_address' => '203.0.113.5',
            'user_agent' => 'TestAgent/1.0',
            'referrer' => null,
        ]);

        $this->actingAs($admin)
            ->get($this->adminPath('/visitors'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Visitors/Index')
                ->has('visits.data', 1)
                ->where('stats.total', 1));
    }

    public function test_visiting_the_main_site_records_a_visit(): void
    {
        $this->assertSame(0, SiteVisit::query()->count());

        $this->get('http://resumegen.test/login')->assertOk();

        $this->assertSame(1, SiteVisit::query()->count());
        $this->assertSame('/login', SiteVisit::query()->first()->path);
    }

    public function test_visiting_the_admin_domain_does_not_record_a_visit(): void
    {
        $this->get($this->adminPath('/does-not-exist-so-guest-redirect'));

        $this->assertSame(0, SiteVisit::query()->count());
    }

    public function test_session_id_is_stored_as_a_hash_not_the_raw_id(): void
    {
        $this->withSession([])->get('http://resumegen.test/login');

        $visit = SiteVisit::query()->first();

        $this->assertNotNull($visit->session_id);
        $this->assertNotSame(session()->getId(), $visit->session_id);
        $this->assertSame(64, strlen($visit->session_id));
    }

    public function test_password_reset_route_is_not_logged(): void
    {
        $this->get('http://resumegen.test/reset-password/some-secret-token');

        $this->assertSame(0, SiteVisit::query()->count());
    }
}
