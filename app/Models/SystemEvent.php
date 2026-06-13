<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemEvent extends Model
{
    /** @use HasFactory<\Database\Factories\SystemEventFactory> */
    use HasFactory;

    public const UPDATED_AT = null; // append-only, no updated_at column

    protected $fillable = [
        'channel',
        'type',
        'status',
        'recipient',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    /**
     * Record a delivery/event. Best-effort: never breaks the send or webhook it observes.
     *
     * @param  array<string, mixed>  $meta
     */
    public static function record(string $channel, string $type, string $status, ?string $recipient = null, array $meta = []): void
    {
        try {
            self::create([
                'channel' => $channel,
                'type' => $type,
                'status' => $status,
                'recipient' => $recipient,
                'meta' => $meta ?: null,
            ]);
        } catch (\Throwable) {
            // best-effort logging
        }
    }
}
