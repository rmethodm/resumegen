<?php

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_record_writes_a_row(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $target = User::factory()->create();

        $this->actingAs($admin);
        AdminAuditLog::record('user.delete', $target, 'Deleted a user', ['k' => 'v']);

        $this->assertDatabaseHas('admin_audit_logs', [
            'admin_user_id' => $admin->id,
            'action' => 'user.delete',
            'target_type' => User::class,
            'target_id' => $target->id,
            'description' => 'Deleted a user',
        ]);
    }

    public function test_toggle_pro_is_audited(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($admin)->patch(route('admin.users.toggle-pro', $user));

        $this->assertDatabaseHas('admin_audit_logs', [
            'admin_user_id' => $admin->id,
            'action' => 'user.toggle-pro',
            'target_id' => $user->id,
        ]);
    }

    public function test_destroy_user_is_audited(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($admin)->delete(route('admin.users.destroy', $user));

        $this->assertDatabaseHas('admin_audit_logs', [
            'admin_user_id' => $admin->id,
            'action' => 'user.delete',
            'target_id' => $user->id,
        ]);
    }

    public function test_index_lists_and_filters(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AdminAuditLog::factory()->create(['admin_user_id' => $admin->id, 'action' => 'user.delete']);
        AdminAuditLog::factory()->create(['admin_user_id' => $admin->id, 'action' => 'ai.block']);

        $this->actingAs($admin)->get(route('admin.audit.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Audit/Index')
                ->has('logs.data', 2)
            );

        $this->actingAs($admin)->get(route('admin.audit.index', ['action' => 'user.delete']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'user.delete')
            );
    }

    public function test_non_admin_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.audit.index'))->assertForbidden();
    }
}
