<x-filament-panels::page>
    <div class="space-y-6">
        <div class="grid grid-cols-3 gap-4">
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Total Requests ({{ $period }})</div>
                <div class="text-2xl font-bold">{{ number_format($totals['requests'] ?? 0) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Total Tokens</div>
                <div class="text-2xl font-bold">{{ number_format($totals['tokens'] ?? 0) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Estimated Cost</div>
                <div class="text-2xl font-bold">${{ number_format(($totals['cost_cents'] ?? 0) / 100, 2) }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">OpenAI Actual Cost</div>
                <div class="text-2xl font-bold">${{ number_format($openAiCostCents / 100, 2) }}</div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
            <div>
                <h3 class="mb-2 font-semibold">By Feature</h3>
                <table class="w-full text-sm">
                    <thead><tr class="text-left text-gray-500"><th>Feature</th><th>Requests</th><th>Tokens</th></tr></thead>
                    <tbody>
                        @foreach($byFeature as $row)
                        <tr class="border-t">
                            <td class="py-1">{{ $row['feature'] }}</td>
                            <td>{{ number_format($row['requests']) }}</td>
                            <td>{{ number_format($row['tokens']) }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div>
                <h3 class="mb-2 font-semibold">By Status</h3>
                <table class="w-full text-sm">
                    <thead><tr class="text-left text-gray-500"><th>Status</th><th>Count</th></tr></thead>
                    <tbody>
                        @foreach($byStatus as $row)
                        <tr class="border-t">
                            <td class="py-1">{{ $row['status'] }}</td>
                            <td>{{ number_format($row['requests']) }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
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
