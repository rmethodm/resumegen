<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPairing extends Model
{
    /**
     * Reserved key covering AI that is not attached to any job, so a user cannot do
     * all their resume work for free and only pay when targeting a posting.
     */
    public const GENERAL = '__general__';

    protected $fillable = [
        'user_id',
        'billing_key',
        'company',
        'title',
        'price_cents',
        'refunded_at',
    ];

    protected function casts(): array
    {
        return [
            'refunded_at' => 'datetime',
        ];
    }

    /**
     * Stable identity for "the same job" across sources, sessions, and months.
     *
     * Deliberately coarser than JobSearchService::dedupe() — it drops location, which
     * varies by source for one posting ("New York, NY" / "New York, New York" / "NYC").
     * Over-merging costs one unit price; under-merging bills twice for a single job,
     * which is the error that actually damages trust.
     *
     * Ceiling: "Sr." vs "Senior" still splits into two keys. Add title-abbreviation
     * folding only if support tickets show it happening.
     *
     * Keys are stored at purchase time and never recomputed — see the note on only
     * ever loosening the normalizer in docs/prepaid-pricing-model.md §6.
     */
    public static function billingKey(string $company, string $title): string
    {
        $clean = function (string $value): string {
            $value = mb_strtolower($value);
            $value = preg_replace('/\b(inc|llc|ltd|corp|co|gmbh|plc)\b\.?/u', '', $value) ?? '';
            $value = preg_replace('/[^\p{L}\p{N} ]+/u', '', $value) ?? '';

            return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
        };

        return $clean($company).'|'.$clean($title);
    }

    /**
     * @return BelongsTo<User, JobPairing>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<BalanceTransaction, $this>
     */
    public function balanceTransactions(): HasMany
    {
        return $this->hasMany(BalanceTransaction::class);
    }

    /**
     * @return HasMany<AiRequest, $this>
     */
    public function aiRequests(): HasMany
    {
        return $this->hasMany(AiRequest::class);
    }

    /**
     * A pairing is self-serve refundable until its first successful AI call. Failures,
     * timeouts, and moderation rejections produce no output, so they must not close the
     * window — a user should never lose the refund to our outage.
     */
    public function isRefundable(): bool
    {
        return $this->refunded_at === null
            && ! $this->aiRequests()->where('status', 'success')->exists();
    }
}
