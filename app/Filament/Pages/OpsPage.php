<?php

namespace App\Filament\Pages;

use App\Models\AdminAuditLog;
use App\Models\SystemEvent;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class OpsPage extends Page
{
    protected static ?string $navigationLabel = 'Ops';

    protected static ?string $navigationIcon = 'heroicon-o-server';

    protected static ?string $navigationGroup = 'Ops';

    protected static string $view = 'filament.pages.ops-page';

    protected function getViewData(): array
    {
        $failedJobs = DB::table('failed_jobs')->latest('failed_at')->limit(50)->get()
            ->map(function ($row): array {
                $payload = json_decode((string) $row->payload, true);

                return [
                    'uuid' => (string) $row->uuid,
                    'queue' => (string) $row->queue,
                    'job' => $payload['displayName'] ?? 'Unknown',
                    'failed_at' => (string) $row->failed_at,
                    'exception_summary' => strtok((string) $row->exception, "\n") ?: '',
                ];
            })->all();

        $recentEvents = SystemEvent::latest()->limit(50)->get()
            ->map(fn (SystemEvent $e): array => [
                'channel' => $e->channel,
                'type' => $e->type,
                'status' => $e->status,
                'recipient' => $e->recipient,
                'created_at' => $e->created_at,
            ])->all();

        $health = [
            ['key' => 'Queue connection', 'ok' => config('queue.default') !== 'sync', 'detail' => config('queue.default')],
            ['key' => 'Mail mailer', 'ok' => true, 'detail' => config('mail.default')],
            ['key' => 'Stripe secret', 'ok' => ! empty(config('cashier.secret')), 'detail' => empty(config('cashier.secret')) ? 'missing' : 'configured'],
            ['key' => 'OpenAI key', 'ok' => ! empty(config('openai.api_key')), 'detail' => empty(config('openai.api_key')) ? 'missing' : 'configured'],
        ];

        return [
            'queue' => ['pending' => DB::table('jobs')->count(), 'failed' => DB::table('failed_jobs')->count()],
            'health' => $health,
            'failedJobs' => $failedJobs,
            'recentEvents' => $recentEvents,
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('retryFailed')
                ->label('Retry Failed Job')
                ->form([
                    TextInput::make('uuid')->label('Job UUID')->required(),
                ])
                ->action(function (array $data) {
                    AdminAuditLog::record('ops.job.retry', null, "Retried failed job {$data['uuid']}", ['uuid' => $data['uuid']]);
                    Artisan::call('queue:retry', ['id' => [$data['uuid']]]);
                    Notification::make()->title('Job re-queued.')->success()->send();
                }),
        ];
    }
}
