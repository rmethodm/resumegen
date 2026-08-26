<?php

namespace Tests\Feature\Admin;

use App\Models\AdminActionLog;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseTableControllerTest extends TestCase
{
    use RefreshDatabase;

    private function adminPath(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('db_panel_fixture', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
    }

    public function test_guest_is_redirected_from_table_browser(): void
    {
        $this->get($this->adminPath('/database/tables/db_panel_fixture'))->assertRedirect();
    }

    public function test_non_admin_cannot_browse_table(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminPath('/database/tables/db_panel_fixture'))
            ->assertForbidden();
    }

    public function test_unknown_table_is_404(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->withConfirmedPassword()
            ->get($this->adminPath('/database/tables/does_not_exist'))
            ->assertNotFound();
    }

    public function test_admin_can_browse_table_rows(): void
    {
        $admin = User::factory()->admin()->create();
        \DB::table('db_panel_fixture')->insert(['name' => 'alpha', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->get($this->adminPath('/database/tables/db_panel_fixture'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Database/Table/Show')
                ->where('table', 'db_panel_fixture')
                ->where('primary_key', 'id')
                ->has('rows.data', 1));
    }

    public function test_admin_can_update_row(): void
    {
        $admin = User::factory()->admin()->create();
        $id = \DB::table('db_panel_fixture')->insertGetId([
            'name' => 'before', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->patch($this->adminPath("/database/tables/db_panel_fixture/rows/{$id}"), [
                'values' => ['name' => 'after'],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('db_panel_fixture', ['id' => $id, 'name' => 'after']);
        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.table.row_updated',
        ]);
    }

    public function test_update_row_cannot_touch_primary_key(): void
    {
        $admin = User::factory()->admin()->create();
        $id = \DB::table('db_panel_fixture')->insertGetId([
            'name' => 'a', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->patch($this->adminPath("/database/tables/db_panel_fixture/rows/{$id}"), [
                'values' => ['id' => 999, 'name' => 'b'],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('db_panel_fixture', ['id' => $id, 'name' => 'b']);
        $this->assertDatabaseMissing('db_panel_fixture', ['id' => 999]);
    }

    public function test_admin_can_delete_row(): void
    {
        $admin = User::factory()->admin()->create();
        $id = \DB::table('db_panel_fixture')->insertGetId([
            'name' => 'gone', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->delete($this->adminPath("/database/tables/db_panel_fixture/rows/{$id}"))
            ->assertRedirect();

        $this->assertDatabaseMissing('db_panel_fixture', ['id' => $id]);
        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.table.row_deleted',
        ]);
    }

    public function test_delete_missing_row_is_404(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->withConfirmedPassword()
            ->delete($this->adminPath('/database/tables/db_panel_fixture/rows/999'))
            ->assertNotFound();
    }

    public function test_admin_can_add_column(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->withConfirmedPassword()
            ->post($this->adminPath('/database/tables/db_panel_fixture/columns'), [
                'name' => 'notes',
                'type' => 'text',
                'nullable' => true,
            ])
            ->assertRedirect();

        $this->assertTrue(Schema::hasColumn('db_panel_fixture', 'notes'));
        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.table.column_added',
        ]);
    }

    public function test_drop_column_requires_exact_confirmation(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->withConfirmedPassword()
            ->delete($this->adminPath('/database/tables/db_panel_fixture/columns/name'), [
                'confirm' => 'wrong',
            ])
            ->assertUnprocessable();

        $this->assertTrue(Schema::hasColumn('db_panel_fixture', 'name'));
    }

    public function test_admin_can_drop_column_with_exact_confirmation(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->withConfirmedPassword()
            ->delete($this->adminPath('/database/tables/db_panel_fixture/columns/name'), [
                'confirm' => 'name',
            ])
            ->assertRedirect();

        $this->assertFalse(Schema::hasColumn('db_panel_fixture', 'name'));
        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.table.column_dropped',
        ]);
    }

    public function test_truncate_requires_exact_table_name_confirmation(): void
    {
        $admin = User::factory()->admin()->create();
        \DB::table('db_panel_fixture')->insert(['name' => 'x', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->post($this->adminPath('/database/tables/db_panel_fixture/truncate'), [
                'confirm' => 'db_panel_fixture_wrong',
            ])
            ->assertUnprocessable();

        $this->assertSame(1, \DB::table('db_panel_fixture')->count());
    }

    public function test_admin_can_truncate_with_exact_confirmation(): void
    {
        $admin = User::factory()->admin()->create();
        \DB::table('db_panel_fixture')->insert(['name' => 'x', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($admin)->withConfirmedPassword()
            ->post($this->adminPath('/database/tables/db_panel_fixture/truncate'), [
                'confirm' => 'db_panel_fixture',
            ])
            ->assertRedirect();

        $this->assertSame(0, \DB::table('db_panel_fixture')->count());

        $log = AdminActionLog::query()->where('action', 'database.table.truncated')->first();
        $this->assertSame(1, $log?->meta['rows_before'] ?? null);
    }
}
