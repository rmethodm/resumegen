<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RevenueSnapshot extends Model
{
    protected $fillable = [
        'captured_on',
        'mrr_cents',
        'paying_users',
        'free_users',
        'active_subscriptions',
        'tier_counts',
    ];

    protected function casts(): array
    {
        return [
            'captured_on' => 'date',
            'tier_counts' => 'array',
        ];
    }
}
