<?php

namespace App\Jobs;

use App\Models\WebhookEndpoint;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class DeliverWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        private readonly WebhookEndpoint $endpoint,
        private readonly string $event,
        private readonly array $payload,
    ) {}

    public function handle(): void
    {
        $body = json_encode([
            'event' => $this->event,
            'data' => $this->payload,
            'timestamp' => now()->toIso8601String(),
        ]);

        $signature = 'sha256='.hash_hmac('sha256', $body, $this->endpoint->secret);

        try {
            Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-Resumegen-Signature' => $signature,
                'X-Resumegen-Event' => $this->event,
            ])->timeout(10)->post($this->endpoint->url, json_decode($body, true));
        } catch (\Throwable) {
            // Silently fail — webhook delivery failures are non-blocking
        }
    }
}
