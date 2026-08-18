<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitorController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        $visits = SiteVisit::query()
            ->with('user:id,name,email')
            ->when($q !== '', function ($query) use ($q) {
                $like = '%'.addcslashes($q, '%_\\').'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('ip_address', 'like', $like)
                        ->orWhere('path', 'like', $like);
                });
            })
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (SiteVisit $visit) => [
                'id' => $visit->id,
                'method' => $visit->method,
                'path' => $visit->path,
                'ip_address' => $visit->ip_address,
                'user_agent' => $visit->user_agent,
                'referrer' => $visit->referrer,
                'created_at' => $visit->created_at?->toIso8601String(),
                'user' => $visit->user === null ? null : [
                    'id' => $visit->user->id,
                    'name' => $visit->user->name,
                    'email' => $visit->user->email,
                ],
            ]);

        return Inertia::render('Admin/Visitors/Index', [
            'visits' => $visits,
            'filters' => [
                'q' => $q,
            ],
            'stats' => [
                'total' => SiteVisit::query()->count(),
                'today' => SiteVisit::query()->whereDate('created_at', now()->toDateString())->count(),
                'unique_ips_today' => SiteVisit::query()
                    ->whereDate('created_at', now()->toDateString())
                    ->distinct('ip_address')
                    ->count('ip_address'),
            ],
        ]);
    }
}
