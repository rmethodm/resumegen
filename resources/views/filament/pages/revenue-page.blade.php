<x-filament-panels::page>
    <div class="space-y-6">
        <div class="grid grid-cols-4 gap-4">
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">MRR</div>
                <div class="text-2xl font-bold">${{ number_format($kpis['mrr_cents'] / 100, 2) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Active Subscriptions</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['active_subscriptions']) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Paying Users</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['paying_users']) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Free Users</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['free_users']) }}</div>
            </div>
        </div>

        <div>
            <h3 class="mb-2 font-semibold">Users by Tier</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500"><th class="py-1">Tier</th><th>Users</th></tr></thead>
                <tbody>
                    @foreach($tierCounts as $tier => $count)
                    <tr class="border-t"><td class="py-1 capitalize">{{ $tier }}</td><td>{{ $count }}</td></tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div>
            <h3 class="mb-2 font-semibold">Recent Subscriptions</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500"><th class="py-1">User</th><th>Plan</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                    @foreach($recent as $sub)
                    <tr class="border-t">
                        <td class="py-1">{{ $sub['email'] ?? $sub['user_email'] ?? '—' }}</td>
                        <td>{{ $sub['plan'] ?? $sub['name'] ?? '—' }}</td>
                        <td>{{ $sub['status'] ?? '—' }}</td>
                        <td class="text-gray-500 text-xs">{{ isset($sub['created_at']) ? \Carbon\Carbon::parse($sub['created_at'])->diffForHumans() : '—' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</x-filament-panels::page>
