<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminDestructiveToolsTest extends TestCase
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

    public function test_select_still_runs_when_destructive_tools_are_disabled(): void
    {
        Config::set('app.admin_destructive_tools', false);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'select * from db_panel_fixture',
            ])
            ->assertOk()
            ->assertJsonCount(1, 'rows');
    }

    public function test_mutating_sql_is_forbidden_when_destructive_tools_are_disabled(): void
    {
        Config::set('app.admin_destructive_tools', false);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'delete from db_panel_fixture',
                'confirm' => 'db_panel_fixture',
            ])
            ->assertForbidden();

        $this->assertSame(1, \DB::table('db_panel_fixture')->count());
    }

    public function test_table_truncate_requires_password_confirmation_when_tools_enabled(): void
    {
        Config::set('app.admin_destructive_tools', true);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post($this->adminPath('/database/tables/db_panel_fixture/truncate'), [
                'confirm' => 'db_panel_fixture',
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->withConfirmedPassword()
            ->post($this->adminPath('/database/tables/db_panel_fixture/truncate'), [
                'confirm' => 'db_panel_fixture',
            ])
            ->assertRedirect();

        $this->assertSame(0, \DB::table('db_panel_fixture')->count());
    }

    public function test_mutating_sql_requires_password_confirmation_when_tools_enabled(): void
    {
        Config::set('app.admin_destructive_tools', true);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'delete from db_panel_fixture',
                'confirm' => 'db_panel_fixture',
            ])
            ->assertStatus(423);

        $this->assertSame(1, \DB::table('db_panel_fixture')->count());

        $this->actingAs($admin)
            ->withConfirmedPassword()
            ->postJson($this->adminPath('/database/query'), [
                'sql' => 'delete from db_panel_fixture',
                'confirm' => 'db_panel_fixture',
            ])
            ->assertOk();

        $this->assertSame(0, \DB::table('db_panel_fixture')->count());
    }

    public function test_admin_pages_share_destructive_tools_flag(): void
    {
        Config::set('app.admin_destructive_tools', false);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/database'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Database/Overview')
                ->where('adminDestructiveTools', false));
    }
}
