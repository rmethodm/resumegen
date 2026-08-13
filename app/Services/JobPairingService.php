<?php

namespace App\Services;

use App\Models\JobPairing;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Resolves the unit of work that AI is billed against: one job, per user, once.
 *
 * Prices are currently 0 (config/pricing.php) — this exists to record pairings so
 * docs/prepaid-pricing-model.md §12 can be answered with real usage data, not to
 * charge anyone.
 */
class JobPairingService
{
    /**
     * Resolve the pairing for a specific job, creating and charging for it if new.
     *
     * @throws InvalidArgumentException when the company name is missing — a null or
     *                                  blank company would normalize to a key shared
     *                                  by every unnamed job, merging them into one.
     */
    public function resolveForJob(User $user, ?string $company, ?string $title): JobPairing
    {
        $key = JobPairing::billingKey((string) $company, (string) $title);

        if (str_starts_with($key, '|')) {
            throw new InvalidArgumentException('A company name is required before a job can be tailored.');
        }

        return $this->resolve($user, $key, $company, $title);
    }

    /**
     * Resolve the reserved pairing covering AI that targets no particular job.
     */
    public function resolveGeneral(User $user): JobPairing
    {
        return $this->resolve($user, JobPairing::GENERAL, null, null);
    }

    private function resolve(User $user, string $key, ?string $company, ?string $title): JobPairing
    {
        $existing = $this->findLive($user, $key);

        if ($existing !== null) {
            return $existing;
        }

        try {
            return DB::transaction(function () use ($user, $key, $company, $title): JobPairing {
                $price = (int) config('pricing.job_cents');

                $pairing = $user->jobPairings()->create([
                    'billing_key' => $key,
                    'company' => $company,
                    'title' => $title,
                    'price_cents' => $price,
                ]);

                $user->balanceTransactions()->create([
                    'amount_cents' => -$price,
                    'reason' => 'charge',
                    'job_pairing_id' => $pairing->id,
                ]);

                return $pairing;
            });
        } catch (QueryException $e) {
            // Lost a race against a concurrent request for the same job — a double-click
            // is enough to cause it. The partial unique index is the guard; re-read what
            // the winner wrote rather than surfacing a 500 or charging twice.
            return $this->findLive($user, $key) ?? throw $e;
        }
    }

    private function findLive(User $user, string $key): ?JobPairing
    {
        return $user->jobPairings()
            ->whereNull('refunded_at')
            ->where('billing_key', $key)
            ->first();
    }
}
