<?php

namespace App\Services;

use App\Models\AiRequest;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AiUsageReport
{
    /**
     * Resolve a period token to a lower-bound timestamp (null = all time).
     */
    public function since(string $period): ?CarbonImmutable
    {
        return match ($period) {
            '7d' => CarbonImmutable::now()->subDays(7),
            '30d' => CarbonImmutable::now()->subDays(30),
            default => null, // 'all'
        };
    }

    private function scoped(string $period): Builder
    {
        $query = AiRequest::query();
        $since = $this->since($period);
        if ($since !== null) {
            $query->where('created_at', '>=', $since);
        }

        return $query;
    }

    /**
     * Costs are reported in micro-cents (1 cent = 1,000,000), the unit they are stored
     * in — callers divide once at display. Every method here uses the key
     * `cost_micro_cents`; totals() previously returned `estimated_cost_cents` while
     * breakdown() returned `cost_cents`, and the overview page read a third spelling.
     *
     * @return array{requests:int, tokens:int, cost_micro_cents:int, flagged:int, success:int, active_users:int}
     */
    public function totals(string $period): array
    {
        $row = $this->scoped($period)
            ->selectRaw('COUNT(*) as requests')
            ->selectRaw('COALESCE(SUM(total_tokens),0) as tokens')
            ->selectRaw('COALESCE(SUM(estimated_cost_micro_cents),0) as cost_micro_cents')
            ->selectRaw("SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw("SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success")
            ->selectRaw('COUNT(DISTINCT user_id) as active_users')
            ->first();

        return [
            'requests' => (int) $row->requests,
            'tokens' => (int) $row->tokens,
            'cost_micro_cents' => (int) $row->cost_micro_cents,
            'flagged' => (int) $row->flagged,
            'success' => (int) $row->success,
            'active_users' => (int) $row->active_users,
        ];
    }

    /**
     * Grouped counts + cost for one of: feature, model, status.
     *
     * @return array<int, array{label:string, count:int, cost_micro_cents:int}>
     */
    public function breakdown(string $column, string $period): array
    {
        if (! in_array($column, ['feature', 'model', 'status'], true)) {
            return [];
        }

        return $this->scoped($period)
            ->selectRaw("COALESCE({$column}, 'unknown') as label")
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(estimated_cost_micro_cents),0) as cost_micro_cents')
            ->groupBy('label')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r): array => [
                'label' => (string) $r->label,
                'count' => (int) $r->count,
                'cost_micro_cents' => (int) $r->cost_micro_cents,
            ])
            ->all();
    }

    /**
     * Daily request volume + cost series for charting.
     *
     * @return array<int, array{date:string, count:int, cost_micro_cents:int}>
     */
    public function dailySeries(string $period): array
    {
        return $this->scoped($period)
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(estimated_cost_micro_cents),0) as cost_micro_cents')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r): array => [
                'date' => (string) $r->date,
                'count' => (int) $r->count,
                'cost_micro_cents' => (int) $r->cost_micro_cents,
            ])
            ->all();
    }
}
