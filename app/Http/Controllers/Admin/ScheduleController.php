<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\CronExplainer;
use Cron\CronExpression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(): Response
    {
        $rows = DB::table('scheduled_task_configs')->orderBy('command')->get();

        return Inertia::render('Admin/Schedule', [
            'tasks' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'command' => $row->command,
                'cron_expression' => $row->cron_expression,
                'enabled' => (bool) $row->enabled,
                'explanation' => CronExplainer::explain($row->cron_expression),
                'next_run_at' => $row->enabled
                    ? (new CronExpression($row->cron_expression))->getNextRunDate()->format(DATE_ATOM)
                    : null,
            ])->all(),
        ]);
    }

    public function update(Request $request, int $scheduledTaskConfig): RedirectResponse
    {
        $data = $request->validate([
            'cron_expression' => ['sometimes', 'string', 'max:100'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['cron_expression']) && ! CronExpression::isValidExpression($data['cron_expression'])) {
            throw ValidationException::withMessages([
                'cron_expression' => 'Not a valid cron expression.',
            ]);
        }

        $updated = DB::table('scheduled_task_configs')
            ->where('id', $scheduledTaskConfig)
            ->update([...$data, 'updated_at' => now()]);

        abort_unless($updated > 0, 404);

        return back();
    }
}
