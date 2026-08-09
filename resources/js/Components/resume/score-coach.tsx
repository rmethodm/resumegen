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
        <div>
            <div className="mb-2 flex items-baseline justify-between px-1">
                <p className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
                    Raise your score
                </p>
                <p className="text-[10px] tabular-nums text-text-tertiary">
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
                            aria-label={`${item.label} — ${item.band}${item.done ? ' (done)' : ''}`}
                            className={cn(
                                'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[11px] leading-snug transition-colors',
                                item.done
                                    ? 'cursor-default text-text-tertiary'
                                    : 'text-text-primary hover:bg-accent-100 hover:text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1',
                            )}
                        >
                            <span
                                className={cn(
                                    'mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                                    item.done
                                        ? 'border-success-border bg-success-bg text-success-text'
                                        : 'border-error-border bg-error-bg text-error-text',
                                )}
                                aria-hidden
                            >
                                {item.done ? 'Done' : 'Missing'}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span>{item.label}</span>
                                <span className="mt-0.5 block text-[10px] font-medium text-text-tertiary">
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
        return (
            <div>
                <p className="mb-1 px-1 text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
                    Keywords
                </p>
                <p className="px-1 text-[11px] leading-relaxed text-text-secondary">
                    Set a target role that includes a family we score — design,
                    engineer, data, product, or market — to unlock keyword
                    chips.
                </p>
            </div>
        );
    }

    if (missing.length === 0 && present.length === 0) {
        return null;
    }

    return (
        <div>
            <p className="mb-1 px-1 text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
                Keywords
            </p>
            <p className="mb-2 px-1 text-[10px] leading-snug text-text-tertiary">
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
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent-500/40 bg-accent-100/50 px-2 py-0.5 text-[11px] font-medium text-accent-text transition-colors hover:border-accent-500 hover:bg-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
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
                            className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success-text"
                        >
                            <CheckIcon className="size-3" />
                            {formatKeywordLabel(keyword)}
                        </span>
                    ))}
                </div>
            )}
            {missing.length === 0 && present.length > 0 && (
                <p className="mt-2 px-1 text-[10px] text-success-text">
                    All role keywords are covered.
                </p>
            )}
        </div>
    );
}
