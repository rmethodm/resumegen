<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Services\DatabaseBackupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BackupController extends Controller
{
    public function index(DatabaseBackupService $backups): Response
    {
        return Inertia::render('Admin/Backups/Index', [
            'backups' => $backups->list()->values()->all(),
            'max_backups' => DatabaseBackupService::MAX_BACKUPS,
            'engine_ok' => config('database.default') === 'pgsql',
        ]);
    }

    public function store(Request $request, DatabaseBackupService $backups): RedirectResponse
    {
        try {
            $filename = $backups->create();
            $this->record($request, 'backup.created', ['filename' => $filename]);

            return redirect()
                ->route('admin.backups.index')
                ->with('success', 'Backup created: '.$filename);
        } catch (Throwable $e) {
            report($e);

            return redirect()
                ->route('admin.backups.index')
                ->with('error', $this->userMessage($e));
        }
    }

    public function download(string $filename, DatabaseBackupService $backups): BinaryFileResponse
    {
        $path = $backups->absolutePath($filename);

        abort_unless(is_file($path), 404);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/gzip',
        ]);
    }

    public function destroy(Request $request, string $filename, DatabaseBackupService $backups): RedirectResponse
    {
        try {
            $backups->delete($filename);
            $this->record($request, 'backup.deleted', ['filename' => $filename]);

            return redirect()
                ->route('admin.backups.index')
                ->with('success', 'Backup deleted: '.$filename);
        } catch (Throwable $e) {
            report($e);

            return redirect()
                ->route('admin.backups.index')
                ->with('error', $this->userMessage($e));
        }
    }

    public function restore(Request $request, string $filename, DatabaseBackupService $backups): RedirectResponse
    {
        $backups->assertValidFilename($filename);

        $validated = $request->validate([
            'confirmation' => ['required', 'string'],
        ]);

        if ($validated['confirmation'] !== $filename) {
            return redirect()
                ->route('admin.backups.index')
                ->withErrors(['confirmation' => 'Type the exact backup filename to confirm restore.'])
                ->with('error', 'Restore cancelled: confirmation did not match.');
        }

        try {
            $backups->restore($filename);
            $this->record($request, 'backup.restored', ['filename' => $filename]);

            return redirect()
                ->route('admin.backups.index')
                ->with('success', 'Database restored from '.$filename);
        } catch (Throwable $e) {
            report($e);

            return redirect()
                ->route('admin.backups.index')
                ->with('error', $this->userMessage($e));
        }
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function record(Request $request, string $action, array $meta): void
    {
        $actor = $request->user();
        if ($actor === null) {
            return;
        }

        AdminActionLog::record($actor, null, $action, $meta);

        Log::info('admin.'.$action, [
            'admin_id' => $actor->id,
            ...$meta,
        ]);
    }

    private function userMessage(Throwable $e): string
    {
        if ($e instanceof RuntimeException) {
            return $e->getMessage();
        }

        return 'Backup operation failed. Check the application log for details.';
    }
}
