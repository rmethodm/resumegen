<?php

namespace App\Models;

use Database\Factories\DeviceTokenFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceToken extends Model
{
    /** @use HasFactory<DeviceTokenFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'expo_push_token', 'platform'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
