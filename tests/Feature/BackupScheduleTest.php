<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule as ScheduleFacade;
use Tests\TestCase;

/**
 * Backups must keep running even when scheduled_task_configs is empty — the
 * table is only an override layer on top of code defaults in routes/console.php.
 */
class BackupScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_backups_are_scheduled_when_the_override_table_is_empty(): void
    {
        DB::table('scheduled_task_configs')->delete();

        $events = $this->freshScheduleEvents();

        $this->assertSame('30 1 * * *', $this->expressionFor($events, 'backup:run'));
        $this->assertSame('0 1 * * *', $this->expressionFor($events, 'backup:clean'));
        $this->assertSame('45 1 * * *', $this->expressionFor($events, 'backup:monitor'));
    }

    public function test_a_disabled_override_unschedules_only_that_backup_command(): void
    {
        DB::table('scheduled_task_configs')->where('command', 'backup:run')->update(['enabled' => false]);

        $events = $this->freshScheduleEvents();

        $this->assertNull($this->expressionFor($events, 'backup:run'));
        $this->assertSame('0 1 * * *', $this->expressionFor($events, 'backup:clean'));
        $this->assertSame('45 1 * * *', $this->expressionFor($events, 'backup:monitor'));
    }

    public function test_unknown_commands_in_the_override_table_are_not_scheduled(): void
    {
        DB::table('scheduled_task_configs')->insert([
            'command' => 'db:wipe',
            'cron_expression' => '* * * * *',
            'enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertNull($this->expressionFor($this->freshScheduleEvents(), 'db:wipe'));
    }

    /**
     * Boot already registered the schedule before RefreshDatabase migrated,
     * so rebuild it from routes/console.php against a clean Schedule.
     *
     * @return array<int, Event>
     */
    private function freshScheduleEvents(): array
    {
        $this->app->instance(Schedule::class, new Schedule);
        ScheduleFacade::clearResolvedInstances();

        require base_path('routes/console.php');

        return app(Schedule::class)->events();
    }

    /**
     * @param  array<int, Event>  $events
     */
    private function expressionFor(array $events, string $command): ?string
    {
        $event = collect($events)->first(fn (Event $event) => str_ends_with($event->command ?? '', "'artisan' {$command}"));

        return $event?->expression;
    }
}
