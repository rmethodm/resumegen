<?php

namespace App\Support;

use RuntimeException;
use Symfony\Component\Process\Process;

class DatabaseDumpRunner
{
    public function dump(string $absolutePath): void
    {
        $this->assertPgsql();

        $partial = $absolutePath.'.partial';
        if (is_file($partial)) {
            @unlink($partial);
        }

        $config = $this->pgsqlConfig();

        $command = sprintf(
            'pg_dump --no-owner --no-acl -h %s -p %s -U %s -d %s | gzip > %s',
            escapeshellarg($config['host']),
            escapeshellarg((string) $config['port']),
            escapeshellarg($config['username']),
            escapeshellarg($config['database']),
            escapeshellarg($partial),
        );

        try {
            $this->run($command, $config['password']);
        } catch (RuntimeException $e) {
            @unlink($partial);
            throw $e;
        }

        if (! is_file($partial) || filesize($partial) === 0) {
            @unlink($partial);
            throw new RuntimeException('Database dump produced an empty file.');
        }

        if (! @rename($partial, $absolutePath)) {
            @unlink($partial);
            throw new RuntimeException('Failed to finalize database dump file.');
        }
    }

    public function restore(string $absolutePath): void
    {
        $this->assertPgsql();

        if (! is_file($absolutePath)) {
            throw new RuntimeException('Backup file not found.');
        }

        $config = $this->pgsqlConfig();

        $command = sprintf(
            'gunzip -c %s | psql -h %s -p %s -U %s -d %s -v ON_ERROR_STOP=1',
            escapeshellarg($absolutePath),
            escapeshellarg($config['host']),
            escapeshellarg((string) $config['port']),
            escapeshellarg($config['username']),
            escapeshellarg($config['database']),
        );

        $this->run($command, $config['password']);
    }

    /**
     * @return array{host: string, port: int|string, database: string, username: string, password: string}
     */
    private function pgsqlConfig(): array
    {
        /** @var array<string, mixed> $config */
        $config = config('database.connections.pgsql', []);

        return [
            'host' => (string) ($config['host'] ?? '127.0.0.1'),
            'port' => $config['port'] ?? 5432,
            'database' => (string) ($config['database'] ?? ''),
            'username' => (string) ($config['username'] ?? ''),
            'password' => (string) ($config['password'] ?? ''),
        ];
    }

    private function assertPgsql(): void
    {
        if (config('database.default') !== 'pgsql') {
            throw new RuntimeException('Database backups require PostgreSQL (DB_CONNECTION=pgsql).');
        }
    }

    private function run(string $command, string $password): void
    {
        $process = Process::fromShellCommandline($command);
        $process->setTimeout(300);
        $process->setEnv([
            'PGPASSWORD' => $password,
            'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin',
        ]);
        $process->run();

        if (! $process->isSuccessful()) {
            $stderr = trim($process->getErrorOutput() ?: $process->getOutput());
            logger()->error('database.dump_runner.failed', [
                'exit_code' => $process->getExitCode(),
                'stderr' => $stderr,
            ]);

            throw new RuntimeException(
                $stderr !== ''
                    ? 'Database dump/restore failed: '.$stderr
                    : 'Database dump/restore failed (exit '.$process->getExitCode().').'
            );
        }
    }
}
