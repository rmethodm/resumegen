<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Subscription;

class RevenueReport
{
    private const TIERS = ['free', 'starter', 'pro', 'agency'];

    /**
     * @return array<string, int>
     */
    public function tierCounts(): array
    {
        $counts = array_fill_keys(self::TIERS, 0);

        $rows = User::query()
            ->selectRaw("COALESCE(plan_tier, 'free') as tier, COUNT(*) as n")
            ->groupBy('tier')
            ->pluck('n', 'tier');

        foreach ($rows as $tier => $n) {
            if (array_key_exists($tier, $counts)) {
                $counts[$tier] = (int) $n;
            }
        }

        return $counts;
    }

    public function mrrCents(): int
    {
        $counts = $this->tierCounts();
        $prices = config('services.stripe.tier_prices', []);

        $mrr = 0;
        foreach (['starter', 'pro', 'agency'] as $tier) {
            $mrr += ($counts[$tier] ?? 0) * (int) ($prices[$tier] ?? 0);
        }

        return $mrr;
    }

    public function payingUsers(): int
    {
        $counts = $this->tierCounts();

        return $counts['starter'] + $counts['pro'] + $counts['agency'];
    }

    public function freeUsers(): int
    {
        return $this->tierCounts()['free'];
    }

    public function activeSubscriptions(): int
    {
        return Subscription::query()
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->count();
    }

    /**
     * @return array<int, array{date: string, count: int, cost_cents: int}>
     */
    public function newSubscriptionsSeries(string $period): array
    {
        $since = $this->since($period);

        return Subscription::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->when($since, fn ($q) => $q->where('created_at', '>=', $since))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row): array => [
                'date' => (string) $row->date,
                'count' => (int) $row->count,
                'cost_cents' => 0,
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, user_name: string|null, user_email: string|null, tier: string, stripe_status: string, created_at: mixed}>
     */
    public function recentSubscriptions(int $limit = 10): array
    {
        $priceToTier = $this->priceIdToTier();

        return Subscription::query()
            ->with('owner:id,name,email,plan_tier')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Subscription $sub): array => [
                'id' => $sub->id,
                'user_name' => $sub->owner?->name,
                'user_email' => $sub->owner?->email,
                'tier' => $priceToTier[$sub->stripe_price] ?? ($sub->owner?->plan_tier ?? 'unknown'),
                'stripe_status' => $sub->stripe_status,
                'created_at' => $sub->created_at,
            ])
            ->all();
    }

    public function liveActiveSubscriptions(): ?int
    {
        if (empty(config('cashier.secret'))) {
            return null;
        }

        try {
            return Cache::remember('revenue.live_active_subs', 3600, function (): int {
                $result = Cashier::stripe()->subscriptions->all(['status' => 'active', 'limit' => 100]);

                return count($result->data);
            });
        } catch (\Throwable $e) {
            Log::warning('Stripe live subscription reconcile failed: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Reverse map of configured Stripe price IDs → tier name.
     *
     * @return array<string, string>
     */
    private function priceIdToTier(): array
    {
        $map = [];
        foreach (['starter', 'pro', 'agency'] as $tier) {
            foreach (["{$tier}_monthly_price_id", "{$tier}_yearly_price_id"] as $key) {
                $id = config("services.stripe.{$key}");
                if ($id) {
                    $map[$id] = $tier;
                }
            }
        }

        return $map;
    }

    private function since(string $period): ?Carbon
    {
        return match ($period) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subDays(90), // 'all' capped to 90d for the chart
        };
    }
}
