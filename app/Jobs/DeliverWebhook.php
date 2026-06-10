<?php

namespace App\Jobs;

use App\Models\WebhookEndpoint;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        } catch (\Throwable $e) {
            // Log webhook delivery failures for debugging
            Log::warning('Webhook delivery failed', [
                'endpoint_id' => $this->endpoint->id,
                'url' => $this->endpoint->url,
                'event' => $this->event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
