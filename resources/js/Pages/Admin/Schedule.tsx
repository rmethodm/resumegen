import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Shell } from '@/Components/ui/shell';

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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Scheduled tasks</h1>
                <p className="mt-1 text-sm text-muted-foreground">Edit cron timing or disable a task without deploying code.</p>

                <Shell className="mt-6" innerClassName="divide-y divide-border">
                    {tasks.map((task) => (
                        <div key={task.id} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{task.command}</p>
                                    <p className="text-xs text-muted-foreground">{task.explanation}</p>
                                </div>
                                <Label className="text-xs font-semibold text-muted-foreground">
                                    <Checkbox
                                        checked={task.enabled}
                                        disabled={processingId === task.id}
                                        onCheckedChange={(checked) => update(task, { enabled: checked === true })}
                                    />
                                    Enabled
                                </Label>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <Input
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
                                    <span className="text-xs text-muted-foreground/70">Next run: {new Date(task.next_run_at).toLocaleString()}</span>
                                )}
                            </div>
                            {errors[task.id] && <p className="mt-1 text-xs text-destructive">{errors[task.id]}</p>}
                        </div>
                    ))}
                </Shell>
            </div>
        </AuthenticatedLayout>
    );
}
