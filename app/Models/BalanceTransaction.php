<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BalanceTransaction extends Model
{
    public const UPDATED_AT = null;

    /** Grants are spendable but never withdrawable to a card — see refundableToCardCents(). */
    public const GRANT_REASONS = ['signup_grant', 'launch_grant'];

    protected $fillable = [
        'user_id',
        'amount_cents',
        'reason',
        'job_pairing_id',
    ];

    /**
     * @return BelongsTo<User, BalanceTransaction>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<JobPairing, BalanceTransaction>
     */
    public function jobPairing(): BelongsTo
    {
        return $this->belongsTo(JobPairing::class);
    }
}
