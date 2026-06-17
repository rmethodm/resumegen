<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\AiRequest;
use App\Models\User;
use App\Services\AiUsageReport;
use App\Services\OpenAiUsageService;
use App\Services\RevenueReport;
use App\Services\UserLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiController extends Controller
{
    public function __construct(
        private AiUsageReport $report,
        private OpenAiUsageService $openAi,
        private RevenueReport $revenue,
    ) {}

    public function overview(Request $request): Response
    {
        $period = $this->period($request);
        $since = $this->report->since($period) ?? now()->subYears(5);

        return Inertia::render('Admin/Ai/Overview', [
            'period' => $period,
            'totals' => $this->report->totals($period),
            'series' => $this->report->dailySeries($period),
            'byFeature' => $this->report->breakdown('feature', $period),
            'byModel' => $this->report->breakdown('model', $period),
            'byStatus' => $this->report->breakdown('status', $period),
            'openAiCostCents' => $this->openAi->totalCostCents($since, now()),
            'mrrCents' => $this->revenue->mrrCents(),
        ]);
    }

    public function users(Request $request): Response
    {
        $period = $this->period($request);
        $since = $this->report->since($period);

        $rows = AiRequest::query()
            ->when($since !== null, fn ($q) => $q->where('created_at', '>=', $since))
            ->selectRaw('user_id')
            ->selectRaw('COUNT(*) as requests')
            ->selectRaw('COALESCE(SUM(total_tokens),0) as tokens')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as estimated_cost_cents')
            ->selectRaw("SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw('MAX(created_at) as last_used')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('estimated_cost_cents')
            ->paginate(25)
            ->withQueryString()
            ->through(function ($row) {
                $user = User::find($row->user_id);

                return [
                    'id' => $row->user_id,
                    'name' => $user?->name,
                    'email' => $user?->email,
                    'tier' => $user?->planTier(),
                    'requests' => (int) $row->requests,
                    'tokens' => (int) $row->tokens,
                    'estimated_cost_cents' => (int) $row->estimated_cost_cents,
                    'flagged' => (int) $row->flagged,
                    'blocked' => (bool) $user?->ai_blocked,
                    'limit' => $user ? UserLimits::aiMonthlyLimit($user) : null,
                    'used' => $user ? UserLimits::aiRequestsThisMonth($user) : null,
                    'last_used' => $row->last_used,
                ];
            });

        return Inertia::render('Admin/Ai/Users', [
            'users' => $rows,
            'period' => $period,
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function user(User $user): Response
    {
        return Inertia::render('Admin/Ai/User', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tier' => $user->planTier(),
                'ai_blocked' => $user->ai_blocked,
                'ai_limit_override' => $user->ai_limit_override,
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
            ],
            'recent' => $user->aiRequests()->latest()->limit(50)->get(['feature', 'model', 'status', 'total_tokens', 'estimated_cost_cents', 'created_at']),
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function resetQuota(User $user): RedirectResponse
    {
        $user->update(['ai_usage_reset_at' => now()]);

        AdminAuditLog::record('ai.reset-quota', $user, "Reset monthly AI usage for {$user->email}");

        return back()->with('success', 'Monthly AI usage reset.');
    }

    public function setLimit(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['limit' => ['nullable', 'integer', 'min:0', 'max:100000']]);
        $user->update(['ai_limit_override' => $data['limit'] ?? null]);

        AdminAuditLog::record('ai.set-limit', $user, "Set AI limit for {$user->email}", ['limit' => $data['limit'] ?? null]);

        return back()->with('success', 'Custom AI limit updated.');
    }

    public function toggleBlock(User $user): RedirectResponse
    {
        $user->update(['ai_blocked' => ! $user->ai_blocked]);

        AdminAuditLog::record('ai.block', $user, ($user->ai_blocked ? 'Blocked' : 'Unblocked')." AI for {$user->email}", ['blocked' => $user->ai_blocked]);

        return back()->with('success', $user->ai_blocked ? 'User AI blocked.' : 'User AI unblocked.');
    }

    public function flagged(): Response
    {
        $items = AiRequest::query()
            ->where('status', 'flagged')
            ->whereNotNull('flagged_text')
            ->with('user:id,name,email')
            ->latest()
            ->paginate(25)
            ->through(fn (AiRequest $r): array => [
                'id' => $r->id,
                'feature' => $r->feature,
                'flagged_text' => $r->flagged_text,
                'created_at' => $r->created_at,
                'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
            ]);

        return Inertia::render('Admin/Ai/Flagged', [
            'items' => $items,
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function destroyFlagged(AiRequest $aiRequest): RedirectResponse
    {
        AdminAuditLog::record('ai.flagged.delete', $aiRequest, 'Deleted a flagged AI entry');

        $aiRequest->delete();

        return back()->with('success', 'Flagged entry deleted.');
    }

    /**
     * Normalize the period query param to a known token.
     */
    private function period(Request $request): string
    {
        $period = (string) $request->query('period', '30d');

        return in_array($period, ['7d', '30d', 'all'], true) ? $period : '30d';
    }
}
