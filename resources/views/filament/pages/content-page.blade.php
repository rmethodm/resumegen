<x-filament-panels::page>
    <div class="space-y-6">
        <div class="flex gap-4 text-sm text-gray-500">
            <span>{{ $counts['resumes'] }} resumes</span>
            <span>{{ $counts['coverLetters'] }} cover letters</span>
            <span>{{ $counts['portfolios'] }} portfolios</span>
        </div>

        <form method="GET" class="flex gap-2">
            <input type="text" name="q" value="{{ $q }}" placeholder="Search by name or email..."
                   class="rounded-lg border px-3 py-1.5 text-sm w-64 dark:bg-gray-800 dark:border-gray-700">
            <button type="submit" class="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white">Search</button>
        </form>

        <div>
            <h3 class="mb-2 font-semibold">Resumes</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500 border-b"><th class="py-1">Name</th><th>Owner</th><th>Template</th><th>Created</th></tr></thead>
                <tbody>
                    @foreach($resumes as $resume)
                    <tr class="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td class="py-1.5">{{ $resume->name }}</td>
                        <td class="text-xs text-gray-500">{{ $resume->user?->email }}</td>
                        <td class="text-xs">{{ $resume->template }}</td>
                        <td class="text-xs text-gray-500">{{ $resume->created_at->diffForHumans() }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            <div class="mt-2">{{ $resumes->links() }}</div>
        </div>

        <div>
            <h3 class="mb-2 font-semibold">Cover Letters</h3>
            <table class="w-full text-sm">
                <thead><tr class="text-left text-gray-500 border-b"><th class="py-1">Name</th><th>Owner</th><th>Template</th><th>Created</th></tr></thead>
                <tbody>
                    @foreach($coverLetters as $cl)
                    <tr class="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td class="py-1.5">{{ $cl->name }}</td>
                        <td class="text-xs text-gray-500">{{ $cl->user?->email }}</td>
                        <td class="text-xs">{{ $cl->template_key }}</td>
                        <td class="text-xs text-gray-500">{{ $cl->created_at->diffForHumans() }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            <div class="mt-2">{{ $coverLetters->links() }}</div>
        </div>
    </div>
</x-filament-panels::page>
