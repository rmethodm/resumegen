<?php

namespace App\Services;

use App\Support\DatabaseDumpRunner;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use RuntimeException;

class DatabaseBackupService
{
    public const MAX_BACKUPS = 10;

    public const FILENAME_PATTERN = '/^resumegen-\d{8}-\d{6}\.sql\.gz$/';

    public function __construct(
        private readonly DatabaseDumpRunner $runner,
    ) {}

    /**
     * @return Collection<int, array{filename: string, size_bytes: int, created_at: string}>
     */
    public function list(): Collection
    {
        $this->ensureDirectory();

        $files = collect(File::files($this->directory()))
            ->filter(fn (\SplFileInfo $file) => (bool) preg_match(self::FILENAME_PATTERN, $file->getFilename()))
            ->sortByDesc(fn (\SplFileInfo $file) => $file->getMTime())
            ->values();

        return $files->map(fn (\SplFileInfo $file) => [
            'filename' => $file->getFilename(),
            'size_bytes' => $file->getSize(),
            'created_at' => date('c', $file->getMTime()),
        ]);
    }

    public function create(): string
    {
        $this->ensureDirectory();

        $filename = 'resumegen-'.now()->format('Ymd-His').'.sql.gz';
        $path = $this->absolutePath($filename);

        if (is_file($path)) {
            throw new RuntimeException('A backup with this name already exists. Try again in a second.');
        }

        $this->runner->dump($path);
        $this->pruneTo(self::MAX_BACKUPS);

        return $filename;
    }

    public function delete(string $filename): void
    {
        $path = $this->absolutePath($filename);

        if (! is_file($path)) {
            throw new RuntimeException('Backup not found.');
        }

        if (! @unlink($path)) {
            throw new RuntimeException('Failed to delete backup.');
        }
    }

    public function restore(string $filename): void
    {
        $path = $this->absolutePath($filename);

        if (! is_file($path)) {
            throw new RuntimeException('Backup not found.');
        }

        $this->runner->restore($path);
    }

    public function absolutePath(string $filename): string
    {
        $this->assertValidFilename($filename);

        return $this->directory().DIRECTORY_SEPARATOR.$filename;
    }

    public function assertValidFilename(string $filename): void
    {
        if ($filename !== basename($filename) || ! preg_match(self::FILENAME_PATTERN, $filename)) {
            abort(404);
        }
    }

    public function pruneTo(int $max = self::MAX_BACKUPS): void
    {
        $this->ensureDirectory();

        $files = collect(File::files($this->directory()))
            ->filter(fn (\SplFileInfo $file) => (bool) preg_match(self::FILENAME_PATTERN, $file->getFilename()))
            ->sortBy(fn (\SplFileInfo $file) => $file->getMTime())
            ->values();

        $excess = $files->count() - $max;
        if ($excess <= 0) {
            return;
        }

        foreach ($files->take($excess) as $file) {
            @unlink($file->getPathname());
        }
    }

    public function directory(): string
    {
        return storage_path('app/private/backups');
    }

    private function ensureDirectory(): void
    {
        $dir = $this->directory();
        if (! is_dir($dir)) {
            File::makeDirectory($dir, 0755, true);
        }
    }
}
