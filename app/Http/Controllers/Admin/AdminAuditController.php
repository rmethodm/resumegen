<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminAuditController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AdminAuditLog::query()->with('admin:id,name,email');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('admin')) {
            $query->where('admin_user_id', $request->input('admin'));
        }

        $logs = $query->latest()->paginate(50)->withQueryString()
            ->through(fn (AdminAuditLog $log): array => [
                'id' => $log->id,
                'admin_name' => $log->admin?->name,
                'admin_email' => $log->admin?->email,
                'action' => $log->action,
                'description' => $log->description,
                'target_type' => $log->target_type ? class_basename($log->target_type) : null,
                'target_id' => $log->target_id,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at,
            ]);

        return Inertia::render('Admin/Audit/Index', [
            'logs' => $logs,
            'actions' => AdminAuditLog::query()->distinct()->orderBy('action')->pluck('action'),
            'admins' => User::query()
                ->whereIn('id', AdminAuditLog::query()->select('admin_user_id')->distinct())
                ->orderBy('name')
                ->get(['id', 'name']),
            'filters' => $request->only(['action', 'admin']),
        ]);
    }
}
