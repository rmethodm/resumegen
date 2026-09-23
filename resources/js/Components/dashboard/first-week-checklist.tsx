import { Link, router } from '@inertiajs/react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { Card } from '@/Components/ui/card';
import { checklistSteps, type ChecklistFacts } from '@/lib/checklist-steps';
import { cn } from '@/lib/utils';

export function FirstWeekChecklist({ facts, dismissed }: { facts: ChecklistFacts; dismissed: boolean }) {
    const steps = checklistSteps(facts);
    const doneCount = steps.filter((s) => s.done).length;

    if (dismissed || doneCount === steps.length) {
        return null;
    }

    function dismiss() {
        router.patch(route('checklist.dismiss'), {}, { preserveScroll: true });
    }

    return (
        <Card className="gap-0 p-4 py-0 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Your first week</p>
                    <p className="mt-1 text-sm text-muted-foreground">{doneCount} of {steps.length} done</p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss checklist"
                    className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                >
                    <XMarkIcon className="size-4" />
                </button>
            </div>
            <ol className="mt-3 space-y-1.5">
                {steps.map((step) => (
                    <li key={step.key}>
                        <Link
                            href={route(step.route)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60',
                                step.done ? 'text-muted-foreground/70 line-through' : 'font-medium text-foreground',
                            )}
                        >
                            {step.done ? (
                                <CheckCircleSolid className="size-4 text-success" />
                            ) : (
                                <CheckCircleIcon className="size-4 text-muted-foreground/70" />
                            )}
                            {step.label}
                        </Link>
                    </li>
                ))}
            </ol>
        </Card>
    );
}
