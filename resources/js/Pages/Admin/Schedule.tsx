import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Checkbox } from '@/Components/ui/checkbox';
import { Shell } from '@/Components/ui/shell';
import TextInput from '@/Components/TextInput';

type ScheduledTask = {
    id: number;
    command: string;
    cron_expression: string;
    enabled: boolean;
    explanation: string;
    next_run_at: string | null;
};

export default function AdminSchedule({ tasks }: { tasks: ScheduledTask[] }) {
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [errors, setErrors] = useState<Record<number, string>>({});

    const update = (task: ScheduledTask, changes: Partial<Pick<ScheduledTask, 'cron_expression' | 'enabled'>>) => {
        setProcessingId(task.id);
        setErrors((current) => ({ ...current, [task.id]: '' }));
        router.patch(route('admin.schedule.update', task.id), changes, {
            preserveScroll: true,
            onError: (pageErrors) => setErrors((current) => ({ ...current, [task.id]: Object.values(pageErrors)[0] ?? 'Invalid.' })),
            onFinish: () => setProcessingId(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Schedule" />

            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold tracking-tight text-ink">Scheduled tasks</h1>
                <p className="mt-1 text-sm text-ink-muted">Edit cron timing or disable a task without deploying code.</p>

                <Shell className="mt-6" innerClassName="divide-y divide-surface-border">
                    {tasks.map((task) => (
                        <div key={task.id} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-ink">{task.command}</p>
                                    <p className="text-xs text-ink-muted">{task.explanation}</p>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                                    <Checkbox
                                        checked={task.enabled}
                                        disabled={processingId === task.id}
                                        onChange={(e) => update(task, { enabled: e.target.checked })}
                                    />
                                    Enabled
                                </label>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <TextInput
                                    defaultValue={task.cron_expression}
                                    disabled={processingId === task.id}
                                    onBlur={(e) => {
                                        if (e.target.value !== task.cron_expression) {
                                            update(task, { cron_expression: e.target.value });
                                        }
                                    }}
                                    className="max-w-xs font-mono text-xs"
                                    aria-label={`Cron expression for ${task.command}`}
                                />
                                {task.next_run_at && (
                                    <span className="text-xs text-ink-faint">Next run: {new Date(task.next_run_at).toLocaleString()}</span>
                                )}
                            </div>
                            {errors[task.id] && <p className="mt-1 text-xs text-danger-text">{errors[task.id]}</p>}
                        </div>
                    ))}
                </Shell>
            </div>
        </AuthenticatedLayout>
    );
}
