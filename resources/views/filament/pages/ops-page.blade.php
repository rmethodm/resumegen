<x-filament-panels::page>
    <div class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Pending Jobs</div>
                <div class="text-2xl font-bold">{{ $queue['pending'] }}</div>
            </div>
            <div class="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div class="text-sm text-gray-500">Failed Jobs</div>
                <div class="text-2xl font-bold {{ $queue['failed'] > 0 ? 'text-red-600' : '' }}">{{ $queue['failed'] }}</div>
            </div>
        </div>

        <div>
            <h3 class="mb-2 font-semibold">System Health</h3>
            <table class="w-full text-sm">
                <tbody>
                    @foreach($health as $item)
                    <tr class="border-t">
                        <td class="py-1 pr-4">{{ $item['key'] }}</td>
                        <td class="w-6">{{ $item['ok'] ? '✅' : '❌' }}</td>
                        <td class="text-gray-500">{{ $item['detail'] }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        @if(count($failedJobs) > 0)
        <div>
            <h3 class="mb-2 font-semibold">Failed Jobs</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500"><th class="py-1">Job</th><th>Queue</th><th>Failed At</th><th>Error</th></tr></thead>
                <tbody>
                    @foreach($failedJobs as $job)
                    <tr class="border-t">
                        <td class="py-1 font-mono text-xs">{{ $job['job'] }}</td>
                        <td>{{ $job['queue'] }}</td>
                        <td class="text-gray-500 text-xs">{{ $job['failed_at'] }}</td>
                        <td class="text-red-600 text-xs truncate max-w-xs">{{ $job['exception_summary'] }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        @endif

        <div>
            <h3 class="mb-2 font-semibold">Recent System Events</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500"><th class="py-1">Channel</th><th>Type</th><th>Status</th><th>Recipient</th><th>When</th></tr></thead>
                <tbody>
                    @foreach($recentEvents as $event)
                    <tr class="border-t">
                        <td class="py-1">{{ $event['channel'] }}</td>
                        <td>{{ $event['type'] }}</td>
                        <td>{{ $event['status'] }}</td>
                        <td class="text-gray-500 text-xs">{{ $event['recipient'] ?? '—' }}</td>
                        <td class="text-gray-500 text-xs">{{ $event['created_at'] ? \Carbon\Carbon::parse($event['created_at'])->diffForHumans() : '—' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</x-filament-panels::page>
