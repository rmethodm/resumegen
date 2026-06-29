<x-filament-panels::page>
    <div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left text-gray-500 border-b">
                    <th class="py-2 pr-4">User</th>
                    <th>Tier</th>
                    <th>Requests</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                    <th>Used / Limit</th>
                    <th>Flagged</th>
                    <th>Last Used</th>
                </tr>
            </thead>
            <tbody>
                @foreach($rows as $row)
                <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td class="py-2 pr-4">
                        <div class="font-medium">{{ $row['name'] }}</div>
                        <div class="text-gray-500 text-xs">{{ $row['email'] }}</div>
                    </td>
                    <td><span class="rounded px-1.5 py-0.5 text-xs bg-gray-100">{{ $row['tier'] }}</span></td>
                    <td>{{ number_format($row['requests']) }}</td>
                    <td>{{ number_format($row['tokens']) }}</td>
                    <td>${{ number_format($row['estimated_cost_cents'] / 100, 4) }}</td>
                    <td>{{ $row['used'] }} / {{ $row['limit'] ?? '∞' }}</td>
                    <td>{{ $row['flagged'] > 0 ? '⚠ '.$row['flagged'] : '—' }}</td>
                    <td class="text-gray-500 text-xs">{{ $row['last_used'] ? \Carbon\Carbon::parse($row['last_used'])->diffForHumans() : '—' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</x-filament-panels::page>
