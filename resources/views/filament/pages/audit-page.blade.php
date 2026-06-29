<x-filament-panels::page>
    <table class="w-full text-sm">
        <thead>
            <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">When</th>
                <th class="pr-4">Admin</th>
                <th class="pr-4">Action</th>
                <th class="pr-4">Target</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            @foreach($logs as $log)
            <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="py-1.5 pr-4 text-gray-500 text-xs whitespace-nowrap">{{ $log->created_at->diffForHumans() }}</td>
                <td class="pr-4 text-xs">{{ $log->admin?->name ?? '—' }}</td>
                <td class="pr-4 font-mono text-xs">{{ $log->action }}</td>
                <td class="pr-4 text-xs text-gray-500">{{ $log->target_type ? class_basename($log->target_type).' #'.$log->target_id : '—' }}</td>
                <td class="text-xs">{{ $log->description }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="mt-4">
        {{ $logs->links() }}
    </div>
</x-filament-panels::page>
