<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ScheduleControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_is_forbidden(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.schedule.index'))->assertForbidden();
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('admin.schedule.index'))->assertRedirect(route('login'));
    }

    public function test_admin_can_list_seeded_schedule_rows(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get(route('admin.schedule.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Schedule')
                ->has('tasks', 3)
                ->where('tasks.0.command', 'backup:clean')
                ->where('tasks.0.cron_expression', '0 1 * * *')
                ->where('tasks.1.command', 'backup:monitor')
                ->where('tasks.2.command', 'backup:run')
            );
    }

    public function test_admin_can_edit_a_schedule_row(): void
    {
        $admin = User::factory()->admin()->create();
        $taskId = DB::table('scheduled_task_configs')->where('command', 'backup:run')->value('id');

        $this->actingAs($admin)
            ->patch(route('admin.schedule.update', $taskId), ['cron_expression' => '0 2 * * *'])
            ->assertRedirect();

        $this->assertDatabaseHas('scheduled_task_configs', ['id' => $taskId, 'cron_expression' => '0 2 * * *']);
    }

    public function test_admin_can_disable_a_schedule_row(): void
    {
        $admin = User::factory()->admin()->create();
        $taskId = DB::table('scheduled_task_configs')->where('command', 'backup:run')->value('id');

        $this->actingAs($admin)
            ->patch(route('admin.schedule.update', $taskId), ['enabled' => false])
            ->assertRedirect();

        $this->assertDatabaseHas('scheduled_task_configs', ['id' => $taskId, 'enabled' => false]);
    }

    public function test_invalid_cron_expression_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        $taskId = DB::table('scheduled_task_configs')->where('command', 'backup:run')->value('id');

        $this->actingAs($admin)
            ->patch(route('admin.schedule.update', $taskId), ['cron_expression' => 'not a cron'])
            ->assertSessionHasErrors('cron_expression');
    }

    public function test_editing_a_row_changes_what_the_scheduler_registers(): void
    {
        DB::table('scheduled_task_configs')
            ->where('command', 'backup:run')
            ->update(['cron_expression' => '0 3 * * *']);

        // Re-run the schedule file now that the table is migrated and the
        // row is edited — mirrors what the next real `schedule:run` sees.
        require base_path('routes/console.php');

        $events = app(Schedule::class)->events();
        $backupRun = collect($events)->first(
            fn ($event) => str_contains($event->command ?? '', 'backup:run') && $event->expression === '0 3 * * *',
        );

        $this->assertNotNull($backupRun);
    }
}
