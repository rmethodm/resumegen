<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteVisit extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'session_id',
        'method',
        'path',
        'ip_address',
        'user_agent',
        'referrer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
