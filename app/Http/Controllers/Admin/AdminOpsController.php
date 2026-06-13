<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\SystemEvent;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminOpsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Ops/Index', [
            'queue' => [
                'pending' => DB::table('jobs')->count(),
                'failed' => DB::table('failed_jobs')->count(),
                'driver' => config('queue.default'),
                'mail' => config('mail.default'),
            ],
            'failedJobs' => $this->failedJobs(),
            'schedule' => $this->schedule(),
            'health' => $this->health(),
            'recentEvents' => $this->recentEvents(),
        ]);
    }

    public function retryFailed(string $uuid): RedirectResponse
    {
        AdminAuditLog::record('ops.job.retry', null, "Retried failed job {$uuid}", ['uuid' => $uuid]);

        Artisan::call('queue:retry', ['id' => [$uuid]]);

        return back()->with('success', 'Job re-queued.');
    }

    public function forgetFailed(string $uuid): RedirectResponse
    {
        AdminAuditLog::record('ops.job.forget', null, "Deleted failed job {$uuid}", ['uuid' => $uuid]);

        DB::table('failed_jobs')->where('uuid', $uuid)->delete();

        return back()->with('success', 'Failed job deleted.');
    }

    /**
     * @return array<int, array{uuid: string, connection: string, queue: string, job: string, failed_at: string, exception_summary: string}>
     */
    private function failedJobs(): array
    {
        return DB::table('failed_jobs')
            ->latest('failed_at')
            ->limit(50)
            ->get()
            ->map(function ($row): array {
                $payload = json_decode((string) $row->payload, true);

                return [
                    'uuid' => (string) $row->uuid,
                    'connection' => (string) $row->connection,
                    'queue' => (string) $row->queue,
                    'job' => $payload['displayName'] ?? 'Unknown job',
                    'failed_at' => (string) $row->failed_at,
                    'exception_summary' => strtok((string) $row->exception, "\n") ?: '',
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: int, channel: string, type: string, status: string, recipient: string|null, created_at: mixed}>
     */
    private function recentEvents(): array
    {
        return SystemEvent::query()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (SystemEvent $e): array => [
                'id' => $e->id,
                'channel' => $e->channel,
                'type' => $e->type,
                'status' => $e->status,
                'recipient' => $e->recipient,
                'created_at' => $e->created_at,
            ])
            ->all();
    }

    /**
     * @return array<int, array{command: string, expression: string}>
     */
    private function schedule(): array
    {
        return collect(app(Schedule::class)->events())
            ->map(fn ($event): array => [
                'command' => trim(str_replace([PHP_BINARY, "'", '"', 'artisan'], '', (string) ($event->command ?? $event->description ?? ''))),
                'expression' => (string) $event->expression,
            ])
            ->all();
    }

    /**
     * @return array<int, array{key: string, ok: bool, detail: string}>
     */
    private function health(): array
    {
        $queue = (string) config('queue.default');
        $mail = (string) config('mail.default');

        return [
            ['key' => 'Queue connection', 'ok' => $queue !== 'sync', 'detail' => $queue],
            ['key' => 'Mail mailer', 'ok' => true, 'detail' => $mail],
            ['key' => 'Stripe secret', 'ok' => ! empty(config('cashier.secret')), 'detail' => empty(config('cashier.secret')) ? 'missing' : 'configured'],
            ['key' => 'Stripe webhook secret', 'ok' => ! empty(config('cashier.webhook.secret')), 'detail' => empty(config('cashier.webhook.secret')) ? 'missing' : 'configured'],
            ['key' => 'OpenAI key', 'ok' => ! empty(config('openai.api_key')), 'detail' => empty(config('openai.api_key')) ? 'missing' : 'configured'],
        ];
    }
}
