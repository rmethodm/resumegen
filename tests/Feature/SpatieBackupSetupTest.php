<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SpatieBackupSetupTest extends TestCase
{
    public function test_backup_config_uses_dedicated_backups_disk(): void
    {
        $this->assertSame(['backups'], config('backup.backup.destination.disks'));
        $this->assertSame(
            storage_path('app/private/spatie-backups'),
            config('filesystems.disks.backups.root'),
        );
        $this->assertContains('backups', config('backup.monitor_backups.0.disks'));
    }

    public function test_backup_commands_are_registered(): void
    {
        $this->assertSame(0, Artisan::call('list', ['--raw' => true]));
        $output = Artisan::output();

        $this->assertStringContainsString('backup:run', $output);
        $this->assertStringContainsString('backup:clean', $output);
        $this->assertStringContainsString('backup:monitor', $output);
        $this->assertStringContainsString('backup:list', $output);
    }

    public function test_backup_commands_are_scheduled_daily(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->map(fn ($event) => $event->command ?? $event->description ?? '')
            ->implode("\n");

        $this->assertStringContainsString('backup:clean', $events);
        $this->assertStringContainsString('backup:run', $events);
        $this->assertStringContainsString('backup:monitor', $events);
    }

    public function test_admin_backup_routes_are_gone(): void
    {
        $this->assertFalse(Route::has('admin.backups.index'));
        $this->assertFalse(Route::has('admin.backups.store'));
        $this->assertFalse(Route::has('admin.backups.download'));
        $this->assertFalse(Route::has('admin.backups.destroy'));
        $this->assertFalse(Route::has('admin.backups.restore'));
    }
}
