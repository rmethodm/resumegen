<?php

namespace App\Models;

use Database\Factories\ProofreadingRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProofreadingRequest extends Model
{
    /** @use HasFactory<ProofreadingRequestFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'resume_id',
        'status',
        'price_cents',
        'stripe_checkout_session_id',
        'feedback',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
