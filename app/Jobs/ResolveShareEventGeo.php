<?php

namespace App\Jobs;

use App\Models\ResumeShareEvent;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Http;

class ResolveShareEventGeo
{
    use Dispatchable;

    /**
     * The raw IP is used for the lookup only and never persisted.
     */
    public function __construct(
        public ResumeShareEvent $event,
        public string $ip,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Private/reserved IPs (localhost, LAN, tests) have no geo data.
        if (! filter_var($this->ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return;
        }

        try {
            // ponytail: free tier is http-only, 45 req/min — plenty for share-link traffic
            $geo = Http::timeout(2)
                ->get("http://ip-api.com/json/{$this->ip}", [
                    'fields' => 'status,country,regionName,city',
                ])
                ->json();

            if (($geo['status'] ?? null) !== 'success') {
                return;
            }

            $this->event->update([
                'country' => substr((string) ($geo['country'] ?? ''), 0, 100) ?: null,
                'region' => substr((string) ($geo['regionName'] ?? ''), 0, 100) ?: null,
                'city' => substr((string) ($geo['city'] ?? ''), 0, 100) ?: null,
            ]);
        } catch (\Throwable) {
            // Geo enrichment is best-effort; never surface failures
        }
    }
}
