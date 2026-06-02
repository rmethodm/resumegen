<?php

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UsageController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $base = AiUsageLog::where('user_id', $userId);

        $totalCost  = (clone $base)->sum('cost_usd');
        $totalCalls = (clone $base)->count();

        $byFeature = (clone $base)
            ->select('feature', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('feature')
            ->get()
            ->map(fn ($r) => ['feature' => $r->feature, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byProvider = (clone $base)
            ->select('provider', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $recentLogs = (clone $base)
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get(['feature', 'provider', 'model', 'cost_usd', 'created_at'])
            ->map(fn ($r) => [
                'feature'    => $r->feature,
                'provider'   => $r->provider,
                'model'      => $r->model,
                'cost_usd'   => (float) $r->cost_usd,
                'created_at' => $r->created_at,
            ])
            ->values();

        return Inertia::render('Usage/Index', [
            'totalCost'  => (float) $totalCost,
            'totalCalls' => $totalCalls,
            'byFeature'  => $byFeature,
            'byProvider' => $byProvider,
            'recentLogs' => $recentLogs,
        ]);
    }
}
