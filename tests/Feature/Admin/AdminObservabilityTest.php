<?php

namespace Tests\Feature\Admin;

use App\Models\AdminActionLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AdminObservabilityTest extends TestCase
{
    use RefreshDatabase;

    private function adminUrl(string $path = '/'): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_destructive_action_log_emits_warning(): void
    {
        Event::fake([MessageLogged::class]);

        $admin = User::factory()->admin()->create();

        AdminActionLog::record($admin, null, 'backup.restored', [
            'filename' => 'resumegen-20260804-120000.sql.gz',
        ]);

        Event::assertDispatched(MessageLogged::class, function (MessageLogged $event) use ($admin): bool {
            return $event->level === 'warning'
                && $event->message === 'admin.destructive_action'
                && ($event->context['action'] ?? null) === 'backup.restored'
                && ($event->context['actor_id'] ?? null) === $admin->id;
        });
    }

    public function test_non_destructive_action_log_does_not_emit_destructive_warning(): void
    {
        Event::fake([MessageLogged::class]);

        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        AdminActionLog::record($admin, $user, 'disable');

        Event::assertNotDispatched(MessageLogged::class, function (MessageLogged $event): bool {
            return $event->message === 'admin.destructive_action';
        });
    }

    public function test_select_query_action_is_not_treated_as_destructive(): void
    {
        $this->assertFalse(AdminActionLog::isDestructive('database.query.select'));
        $this->assertFalse(AdminActionLog::isDestructive('database.query.explain'));
        $this->assertTrue(AdminActionLog::isDestructive('database.query.delete'));
        $this->assertTrue(AdminActionLog::isDestructive('database.table.truncated'));
        $this->assertTrue(AdminActionLog::isDestructive('database.role.dropped'));
    }

    public function test_failed_admin_host_login_is_logged(): void
    {
        Event::fake([MessageLogged::class]);

        $admin = User::factory()->admin()->create([
            'email' => 'admin-fail-log@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->post($this->adminUrl('/login'), [
            'email' => $admin->email,
            'password' => 'wrong-password',
        ])->assertRedirect();

        Event::assertDispatched(MessageLogged::class, function (MessageLogged $event) use ($admin): bool {
            return $event->level === 'warning'
                && $event->message === 'admin.login_failed'
                && ($event->context['email'] ?? null) === $admin->email;
        });
    }

    public function test_failed_product_login_does_not_emit_admin_login_failed(): void
    {
        Event::fake([MessageLogged::class]);

        $user = User::factory()->create([
            'email' => 'product-fail-log@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertRedirect();

        Event::assertNotDispatched(MessageLogged::class, function (MessageLogged $event): bool {
            return $event->message === 'admin.login_failed';
        });
    }
}
