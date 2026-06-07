<?php

namespace App\Models;

use Database\Factories\WebhookEndpointFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WebhookEndpoint extends Model
{
    /** @use HasFactory<WebhookEndpointFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'url', 'events', 'active'];

    protected $casts = ['events' => 'array', 'active' => 'boolean'];

    protected static function booted(): void
    {
        static::creating(function (self $endpoint) {
            $endpoint->secret = Str::random(32);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
