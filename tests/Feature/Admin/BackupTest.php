<?php

namespace Tests\Feature\Admin;

use App\Models\AdminActionLog;
use App\Models\User;
use App\Services\DatabaseBackupService;
use App\Support\DatabaseDumpRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Mockery;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    private string $backupDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->backupDir = storage_path('app/private/backups');
        File::ensureDirectoryExists($this->backupDir);
        $this->clearBackupFiles();
    }

    protected function tearDown(): void
    {
        $this->clearBackupFiles();
        parent::tearDown();
    }

    private function adminPath(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    private function clearBackupFiles(): void
    {
        if (! is_dir($this->backupDir)) {
            return;
        }

        foreach (File::files($this->backupDir) as $file) {
            if ($file->getFilename() !== '.gitignore') {
                @unlink($file->getPathname());
            }
        }
    }

    private function seedBackupFile(string $filename, string $contents = 'fake-dump'): string
    {
        $path = $this->backupDir.DIRECTORY_SEPARATOR.$filename;
        file_put_contents($path, $contents);

        return $path;
    }

    private function fakeRunnerThatWritesFile(): void
    {
        $runner = Mockery::mock(DatabaseDumpRunner::class);
        $runner->shouldReceive('dump')
            ->andReturnUsing(function (string $path): void {
                file_put_contents($path, gzencode('-- fake sql dump'));
            });
        $runner->shouldReceive('restore')->byDefault();
        $this->app->instance(DatabaseDumpRunner::class, $runner);
    }

    public function test_guest_is_redirected_from_backups(): void
    {
        $this->get($this->adminPath('/backups'))->assertRedirect();
    }

    public function test_non_admin_cannot_list_backups(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get($this->adminPath('/backups'))
            ->assertForbidden();
    }

    public function test_admin_can_list_empty_backups(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/backups'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Backups/Index')
                ->has('backups', 0)
                ->where('max_backups', 10));
    }

    public function test_admin_can_list_existing_backups(): void
    {
        $admin = User::factory()->admin()->create();
        $this->seedBackupFile('resumegen-20260804-120000.sql.gz', 'abc');

        $this->actingAs($admin)
            ->get($this->adminPath('/backups'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Backups/Index')
                ->has('backups', 1)
                ->where('backups.0.filename', 'resumegen-20260804-120000.sql.gz'));
    }

    public function test_admin_can_create_backup(): void
    {
        $this->fakeRunnerThatWritesFile();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post($this->adminPath('/backups'))
            ->assertRedirect($this->adminPath('/backups'))
            ->assertSessionHas('success');

        $files = collect(File::files($this->backupDir))
            ->map(fn ($f) => $f->getFilename())
            ->filter(fn ($name) => $name !== '.gitignore')
            ->values();

        $this->assertCount(1, $files);
        $this->assertMatchesRegularExpression('/^resumegen-\d{8}-\d{6}\.sql\.gz$/', $files[0]);

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'backup.created',
        ]);
    }

    public function test_create_prunes_to_max_ten(): void
    {
        $this->fakeRunnerThatWritesFile();
        $admin = User::factory()->admin()->create();

        for ($i = 1; $i <= 10; $i++) {
            $name = sprintf('resumegen-20260804-%06d.sql.gz', $i);
            $path = $this->seedBackupFile($name, "old-{$i}");
            touch($path, 1_700_000_000 + $i);
        }

        $this->actingAs($admin)
            ->post($this->adminPath('/backups'))
            ->assertRedirect($this->adminPath('/backups'));

        $remaining = collect(File::files($this->backupDir))
            ->map(fn ($f) => $f->getFilename())
            ->filter(fn ($name) => preg_match('/^resumegen-/', $name))
            ->values();

        $this->assertCount(10, $remaining);
        $this->assertFalse($remaining->contains('resumegen-20260804-000001.sql.gz'));
    }

    public function test_admin_can_download_backup(): void
    {
        $admin = User::factory()->admin()->create();
        $this->seedBackupFile('resumegen-20260804-120000.sql.gz', 'payload-bytes');

        $this->actingAs($admin)
            ->get($this->adminPath('/backups/resumegen-20260804-120000.sql.gz'))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_download_rejects_path_traversal(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/backups/'.rawurlencode('../.env')))
            ->assertNotFound();
    }

    public function test_download_missing_file_is_404(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/backups/resumegen-20260804-999999.sql.gz'))
            ->assertNotFound();
    }

    public function test_admin_can_delete_backup(): void
    {
        $admin = User::factory()->admin()->create();
        $this->seedBackupFile('resumegen-20260804-120000.sql.gz', 'x');

        $this->actingAs($admin)
            ->delete($this->adminPath('/backups/resumegen-20260804-120000.sql.gz'))
            ->assertRedirect($this->adminPath('/backups'))
            ->assertSessionHas('success');

        $this->assertFileDoesNotExist($this->backupDir.'/resumegen-20260804-120000.sql.gz');
        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'backup.deleted',
        ]);
    }

    public function test_restore_rejects_wrong_confirmation(): void
    {
        $runner = Mockery::mock(DatabaseDumpRunner::class);
        $runner->shouldNotReceive('restore');
        $this->app->instance(DatabaseDumpRunner::class, $runner);

        $admin = User::factory()->admin()->create();
        $this->seedBackupFile('resumegen-20260804-120000.sql.gz', 'x');

        $this->actingAs($admin)
            ->from($this->adminPath('/backups'))
            ->post($this->adminPath('/backups/resumegen-20260804-120000.sql.gz/restore'), [
                'confirmation' => 'wrong-name.sql.gz',
            ])
            ->assertRedirect($this->adminPath('/backups'))
            ->assertSessionHasErrors('confirmation');

        $this->assertDatabaseMissing('admin_action_logs', [
            'action' => 'backup.restored',
        ]);
    }

    public function test_restore_accepts_exact_filename_and_calls_runner(): void
    {
        $filename = 'resumegen-20260804-120000.sql.gz';
        $path = $this->seedBackupFile($filename, 'x');

        $runner = Mockery::mock(DatabaseDumpRunner::class);
        $runner->shouldReceive('restore')
            ->once()
            ->with(Mockery::on(fn (string $p) => realpath($p) === realpath($path) || $p === $path));
        $this->app->instance(DatabaseDumpRunner::class, $runner);

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post($this->adminPath('/backups/'.$filename.'/restore'), [
                'confirmation' => $filename,
            ])
            ->assertRedirect($this->adminPath('/backups'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'action' => 'backup.restored',
        ]);

        $log = AdminActionLog::query()->where('action', 'backup.restored')->first();
        $this->assertNull($log?->target_user_id);
        $this->assertSame($filename, $log?->meta['filename'] ?? null);
    }

    public function test_disabled_admin_cannot_access_backups(): void
    {
        $admin = User::factory()->admin()->disabled()->create();

        $this->actingAs($admin)
            ->get($this->adminPath('/backups'))
            ->assertRedirect();
    }

    public function test_service_rejects_invalid_filename(): void
    {
        $service = $this->app->make(DatabaseBackupService::class);

        $this->expectException(HttpException::class);
        $service->absolutePath('../../.env');
    }
}
