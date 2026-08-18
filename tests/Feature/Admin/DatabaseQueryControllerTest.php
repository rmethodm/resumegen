<?php

namespace Tests\Feature\Admin;

use App\Models\AdminActionLog;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseQueryControllerTest extends TestCase
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
        });

        \DB::table('db_panel_fixture')->insert(['name' => 'alpha']);
    }

    public function test_guest_is_redirected_from_query_runner(): void
    {
        $this->get($this->adminPath('/database/query'))->assertRedirect();
    }

    public function test_non_admin_cannot_run_queries(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson($this->adminPath('/database/query'), ['sql' => 'select 1'])
            ->assertForbidden();
    }

    public function test_select_runs_without_confirmation(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'select * from db_panel_fixture',
            ])
            ->assertOk()
            ->assertJsonCount(1, 'rows');
    }

    public function test_delete_without_matching_confirmation_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'delete from db_panel_fixture',
            ])
            ->assertUnprocessable();

        $this->assertSame(1, \DB::table('db_panel_fixture')->count());
    }

    public function test_delete_with_matching_confirmation_runs_and_is_logged(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'delete from db_panel_fixture',
                'confirm' => 'db_panel_fixture',
            ])
            ->assertOk();

        $this->assertSame(0, \DB::table('db_panel_fixture')->count());

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.query.delete',
        ]);

        $log = AdminActionLog::query()->where('action', 'database.query.delete')->first();
        $this->assertSame('delete from db_panel_fixture', $log?->meta['sql'] ?? null);
    }

    public function test_failed_query_is_logged_and_returns_error(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'select * from does_not_exist',
            ])
            ->assertUnprocessable();

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'database.query.failed',
        ]);
    }
}
