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
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Raise your score
                </p>
                <p className="text-[10px] tabular-nums text-gray-400">
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
                                'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[11px] leading-snug transition-colors',
                                item.done
                                    ? 'cursor-default text-gray-400'
                                    : 'text-gray-800 hover:bg-brand-subtle hover:text-brand',
                            )}
                        >
                            <span
                                className={cn(
                                    'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                                    item.done
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-300 bg-white',
                                )}
                                aria-hidden
                            >
                                {item.done && (
                                    <CheckIcon className="size-2.5 stroke-[3]" />
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
                                <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-gray-400 uppercase">
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
            <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Role keywords
                </p>
                <p className="px-1 text-[11px] leading-relaxed text-gray-500">
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
        <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Role keywords
            </p>
            <p className="mb-2 px-1 text-[10px] leading-snug text-gray-500">
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
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand/40 bg-brand-subtle/50 px-2 py-0.5 text-[11px] font-medium text-brand transition-colors hover:border-brand hover:bg-brand-subtle"
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
                            className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800"
                        >
                            <CheckIcon className="size-3" />
                            {formatKeywordLabel(keyword)}
                        </span>
                    ))}
                </div>
            )}
            {missing.length === 0 && present.length > 0 && (
                <p className="mt-2 px-1 text-[10px] text-green-700">
                    All role keywords are covered.
                </p>
            )}
        </div>
    );
}
