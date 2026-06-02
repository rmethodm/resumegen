<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminUsageController extends Controller
{
    public function index(Request $request): Response
    {
        $range = $request->query('range', '30days');

        $query = AiUsageLog::query();
        $query = match ($range) {
            'month'  => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'all'    => $query,
            default  => $query->where('created_at', '>=', now()->subDays(30)),
        };

        $totalCost = (clone $query)->sum('cost_usd');

        $byProvider = (clone $query)
            ->select('provider', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byModel = (clone $query)
            ->select('provider', 'model', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider', 'model')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'model' => $r->model, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byFeature = (clone $query)
            ->select('feature', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('feature')
            ->get()
            ->map(fn ($r) => ['feature' => $r->feature, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $perUser = (clone $query)
            ->select('user_id', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'), DB::raw('MAX(created_at) as last_active'))
            ->groupBy('user_id')
            ->with('user:id,name,email')
            ->get()
            ->map(fn ($r) => [
                'user_id'     => $r->user_id,
                'name'        => $r->user?->name ?? '—',
                'email'       => $r->user?->email ?? '—',
                'calls'       => $r->calls,
                'cost'        => (float) $r->cost,
                'last_active' => $r->last_active,
            ])
            ->sortByDesc('cost')
            ->values();

        return Inertia::render('Admin/Usage', [
            'totalCost'  => (float) $totalCost,
            'byProvider' => $byProvider,
            'byModel'    => $byModel,
            'byFeature'  => $byFeature,
            'perUser'    => $perUser,
            'dateRange'  => $range,
        ]);
    }
}
