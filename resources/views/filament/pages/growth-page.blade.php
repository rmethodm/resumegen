<x-filament-panels::page>
    <div class="space-y-6">
        <div class="grid grid-cols-4 gap-4">
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Total Users</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['total_users']) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Activation Rate</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['activation_rate'], 1) }}%</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Conversion Rate</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['conversion_rate'], 1) }}%</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Avg Days to Convert</div>
                <div class="text-2xl font-bold">{{ number_format($kpis['avg_days_to_convert'], 1) }}</div>
            </div>
        </div>

        <div>
            <h3 class="mb-2 font-semibold">Conversion Funnel</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500"><th class="py-1">Stage</th><th>Count</th></tr></thead>
                <tbody>
                    @foreach($funnel as $stage => $count)
                    <tr class="border-t"><td class="py-1 capitalize">{{ str_replace('_', ' ', $stage) }}</td><td>{{ number_format($count) }}</td></tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="flex gap-2">
            @foreach(['7d' => '7 days', '30d' => '30 days', 'all' => 'All time'] as $p => $label)
            <a href="{{ request()->fullUrlWithQuery(['period' => $p]) }}"
               class="rounded px-3 py-1 text-sm {{ $period === $p ? 'bg-slate-700 text-white' : 'bg-gray-100' }}">
                {{ $label }}
            </a>
            @endforeach
        </div>
    </div>
</x-filament-panels::page>
