import { CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
    formatKeywordLabel,
    type ScoreChecklistItem,
} from '@/lib/resume-analysis';
import { cn } from '@/lib/utils';

/**
 * First-session score path + missing keyword chips.
 * Pure presentation — parent owns draft mutations and navigation.
 */
export function ScoreChecklist({
    items,
    onJump,
}: {
    items: ScoreChecklistItem[];
    onJump: (item: ScoreChecklistItem) => void;
}) {
    const remaining = items.filter((item) => !item.done).length;
    const doneCount = items.length - remaining;

    if (remaining === 0) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-surface-border pt-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    Raise your score
                </p>
                <p className="text-xs tabular-nums text-ink-faint">
                    {doneCount}/{items.length}
                </p>
            </div>
            <ul className="space-y-1">
                {items.map((item) => (
                    <li key={item.id}>
                        <button
                            type="button"
                            disabled={item.done}
                            onClick={() => onJump(item)}
                            className={cn(
                                'focus-ring flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs leading-snug transition-colors',
                                item.done
                                    ? 'cursor-default text-ink-faint'
                                    : 'text-ink hover:bg-brand-subtle hover:text-brand',
                            )}
                        >
                            <span
                                className={cn(
                                    'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                                    item.done
                                        ? 'border-success bg-success text-white'
                                        : 'border-surface-border bg-white',
                                )}
                                aria-hidden
                            >
                                {item.done && (
                                    <CheckIcon className="size-2.5 stroke-3" />
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span
                                    className={cn(
                                        item.done && 'line-through',
                                    )}
                                >
                                    {item.label}
                                </span>
                                <span className="mt-0.5 block text-xs font-medium tracking-wide text-ink-faint uppercase">
                                    {item.band}
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function KeywordChips({
    missing,
    present,
    hasRoleFamily,
    onAdd,
}: {
    missing: string[];
    present: string[];
    /** False when target role is empty or unrecognized. */
    hasRoleFamily: boolean;
    onAdd: (keyword: string) => void;
}) {
    if (!hasRoleFamily) {
        return null;
    }

    if (missing.length === 0 && present.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-surface-border pt-4">
            <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Role keywords
            </p>
            <p className="mb-2 px-1 text-xs leading-snug text-ink-muted">
                Click a missing term to add it as a skill. Only add skills you
                actually have.
            </p>
            {missing.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 px-0.5">
                    {missing.map((keyword) => (
                        <button
                            key={keyword}
                            type="button"
                            onClick={() => onAdd(keyword)}
                            title={`Add “${formatKeywordLabel(keyword)}” as a skill`}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand/40 bg-brand-subtle/50 px-2 py-0.5 text-xs font-medium text-brand transition-colors hover:border-brand hover:bg-brand-subtle"
                        >
                            <PlusIcon className="size-3" />
                            {formatKeywordLabel(keyword)}
                        </button>
                    ))}
                </div>
            )}
            {present.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-0.5">
                    {present.map((keyword) => (
                        <span
                            key={keyword}
                            className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-subtle px-2 py-0.5 text-xs font-medium text-success-text"
                        >
                            <CheckIcon className="size-3" />
                            {formatKeywordLabel(keyword)}
                        </span>
                    ))}
                </div>
            )}
            {missing.length === 0 && present.length > 0 && (
                <p className="mt-2 px-1 text-xs text-success-text">
                    All role keywords are covered.
                </p>
            )}
        </div>
    );
}
