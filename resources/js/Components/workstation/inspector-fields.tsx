import {
    Bars3Icon,
    ChevronDownIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import type { DragEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    joinMonthYear,
    monthNames,
    splitMonthYear,
    years,
} from '@/lib/month-year';
import { cn } from '@/lib/utils';
import type { ResumeBulletStyle, ResumeSkillsLayout } from '@/types';

/** Move one item, shifting the rest — shared by every drag-reorderable list. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    next.splice(to, 0, ...next.splice(from, 1));

    return next;
}

export const skillLayouts: ResumeSkillsLayout[] = [
    'inline',
    'bullets',
    'grouped',
    'columns',
    'narrative',
];

/** A bar of the thumbnail sketch; `dark` marks a category/heading run. */
function Bar({ w, dark = false }: { w: string; dark?: boolean }) {
    return (
        <span
            className={cn(
                'h-1.5 rounded-full',
                dark ? 'bg-gray-700/70' : 'bg-brand/30',
            )}
            style={{ width: w }}
        />
    );
}

function Dot() {
    return <span className="size-1 shrink-0 rounded-full bg-gray-700/60" />;
}

/** A wordless sketch of how the layout arranges skills on the page. */
export function LayoutThumb({ layout }: { layout: ResumeSkillsLayout }) {
    switch (layout) {
        case 'bullets':
            return (
                <div className="flex flex-col gap-1.5">
                    {['70%', '55%', '62%'].map((w) => (
                        <span key={w} className="flex items-center gap-1.5">
                            <Dot />
                            <Bar w={w} />
                        </span>
                    ))}
                </div>
            );
        case 'grouped':
            return (
                <div className="flex flex-col gap-1.5">
                    {['40%', '32%', '36%'].map((w) => (
                        <span key={w} className="flex items-center gap-1.5">
                            <Bar w={w} dark />
                            <Bar w="30%" />
                            <Bar w="22%" />
                        </span>
                    ))}
                </div>
            );
        case 'columns':
            return (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <Bar w="60%" dark />
                    <Bar w="60%" dark />
                    <Bar w="80%" />
                    <Bar w="70%" />
                    <Bar w="65%" />
                    <Bar w="85%" />
                </div>
            );
        case 'narrative':
            return (
                <div className="flex flex-col gap-1.5">
                    <Bar w="85%" dark />
                    {['75%', '80%', '55%'].map((w) => (
                        <Bar key={w} w={w} />
                    ))}
                </div>
            );
        case 'inline':
        default:
            return (
                <div className="flex items-center gap-1.5">
                    <Bar w="22%" />
                    <Dot />
                    <Bar w="18%" />
                    <Dot />
                    <Bar w="24%" />
                    <Dot />
                    <Bar w="16%" />
                </div>
            );
    }
}

export const bulletStyles: ResumeBulletStyle[] = ['bullet', 'numbered', 'indented'];

/** A wordless sketch of how the style marks each experience bullet. */
export function BulletStyleThumb({ style }: { style: ResumeBulletStyle }) {
    switch (style) {
        case 'numbered':
            return (
                <div className="flex flex-col gap-1.5">
                    {['70%', '55%'].map((w, index) => (
                        <span key={w} className="flex items-center gap-1.5">
                            <span className="text-[9px] font-semibold text-ink-muted">
                                {index + 1}.
                            </span>
                            <Bar w={w} />
                        </span>
                    ))}
                </div>
            );
        case 'indented':
            return (
                <div className="flex flex-col gap-1.5 pl-2.5">
                    <Bar w="70%" />
                    <Bar w="55%" />
                </div>
            );
        case 'bullet':
        default:
            return (
                <div className="flex flex-col gap-1.5">
                    {['70%', '55%'].map((w) => (
                        <span key={w} className="flex items-center gap-1.5">
                            <Dot />
                            <Bar w={w} />
                        </span>
                    ))}
                </div>
            );
    }
}

/**
 * `error` is held back until the field has been blurred once — validating as
 * the user types turns every half-written address red mid-word. After that
 * first blur it tracks live, so the message clears the moment it is fixed.
 */
export function Field({
    label,
    value,
    onChange,
    type = 'text',
    error = null,
    placeholder,
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    error?: string | null;
    placeholder?: string;
    /** Mirrors the matching UpdateResumeRequest rule — keep the two in step. */
    maxLength?: number;
}) {
    const [touched, setTouched] = useState(false);
    const messageId = useId();
    const show = touched && error !== null;

    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
                type={type}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={show}
                aria-describedby={show ? messageId : undefined}
            />
            {show && (
                <p
                    id={messageId}
                    role="alert"
                    className="text-xs text-danger"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

/** One half of the pair below; they differ only in their options. A plain
 * native select — no listbox library needed for a handful of options. */
function PartSelect({
    value,
    options,
    placeholder,
    disabled,
    className,
    onChange,
}: {
    value: string;
    options: string[];
    placeholder: string;
    disabled: boolean;
    className?: string;
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
                'h-11 min-h-11 rounded-md border border-surface-border bg-white px-2 text-sm shadow-xs outline-hidden focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        >
            <option value="">{placeholder}</option>
            {options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );
}

/**
 * Month and year as two dropdowns rather than one list of every month in the
 * range — 12 and 86 options instead of 1,032.
 *
 * Dates were free text before this existed. A stored value the pair cannot
 * represent is shown as-is and left alone until the user picks something,
 * rather than being silently blanked on the next autosave.
 */
export function MonthYearField({
    label,
    value,
    onChange,
    disabled = false,
    presentLabel = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    presentLabel?: boolean;
}) {
    const { month, year, unparsed } = splitMonthYear(value);

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-xs">{label}</Label>
            {/* Flex widths so Start + End can share one row in Pair without
                overflowing the inspector column. */}
            <div className="flex min-w-0 gap-2">
                <PartSelect
                    value={month}
                    options={monthNames}
                    disabled={disabled}
                    className="min-w-0 flex-1"
                    placeholder={presentLabel ? 'Present' : 'Month'}
                    onChange={(next) => onChange(joinMonthYear(next, year))}
                />
                <PartSelect
                    value={year}
                    options={years}
                    disabled={disabled}
                    className="min-w-0 flex-1"
                    placeholder={presentLabel ? '' : 'Year'}
                    onChange={(next) => onChange(joinMonthYear(month, next))}
                />
            </div>
            {unparsed !== '' && (
                <p className="text-xs text-ink-muted">
                    Currently “{unparsed}”. Picking a month or year replaces it.
                </p>
            )}
        </div>
    );
}

export function Pair({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-2 items-start gap-2.5">{children}</div>
    );
}

/**
 * Text URL field with a soft live-site check on blur. Does not block autosave —
 * it only warns when the URL looks unreachable (non-2xx/3xx or connection fail).
 */
export function UrlField({
    label,
    value,
    onChange,
    placeholder,
    maxLength = 255,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
}) {
    const [touched, setTouched] = useState(false);
    const [checking, setChecking] = useState(false);
    const [reachabilityError, setReachabilityError] = useState<string | null>(
        null,
    );
    const messageId = useId();
    const requestId = useRef(0);

    async function checkUrl(next: string) {
        const trimmed = next.trim();

        if (trimmed === '') {
            setReachabilityError(null);
            setChecking(false);

            return;
        }

        const id = ++requestId.current;
        setChecking(true);

        try {
            const response = await fetch(route('urls.check'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({ url: trimmed }),
            });

            if (id !== requestId.current) {
                return;
            }

            if (!response.ok) {
                setReachabilityError(
                    'We couldn\'t check this URL right now. Try again in a moment.',
                );

                return;
            }

            const payload = (await response.json()) as {
                ok?: boolean;
                message?: string | null;
            };

            setReachabilityError(
                payload.ok ? null : (payload.message ?? 'This URL doesn\'t look reachable right now.'),
            );
        } catch {
            if (id !== requestId.current) {
                return;
            }

            setReachabilityError(
                'We couldn\'t check this URL right now. Try again in a moment.',
            );
        } finally {
            if (id === requestId.current) {
                setChecking(false);
            }
        }
    }

    const show = touched && reachabilityError !== null;

    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
                type="url"
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(event) => {
                    onChange(event.target.value);
                    setReachabilityError(null);
                }}
                onBlur={() => {
                    setTouched(true);
                    void checkUrl(value);
                }}
                aria-invalid={show}
                aria-describedby={
                    show || checking ? messageId : undefined
                }
            />
            {checking && (
                <p id={messageId} className="text-xs text-ink-muted">
                    Checking if this site is online…
                </p>
            )}
            {show && !checking && (
                <p
                    id={messageId}
                    role="alert"
                    className="text-xs text-danger"
                >
                    {reachabilityError}
                </p>
            )}
        </div>
    );
}

/** Drag affordance for one entry in a reorderable list — see `useEntryReorder`. */
type EntryDragHandle = {
    dragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    /** Keyboard alternative to drag — same Alt+↑/↓ contract as BulletsField. */
    onKeyMove: (offset: -1 | 1) => void;
};

/**
 * Same native-drag reorder as `BulletsField`, generalized to any list. Returns
 * a `dragHandle(index)` to spread onto each `EntryCard`.
 */
export function useEntryReorder<T>(
    list: T[],
    onChange: (list: T[]) => void,
): (index: number) => EntryDragHandle {
    const [dragging, setDragging] = useState<number | null>(null);

    return (index) => ({
        dragging: dragging === index,
        onDragStart: () => setDragging(index),
        onDragEnd: () => setDragging(null),
        onDragOver: (event) => {
            event.preventDefault();

            if (dragging !== null && dragging !== index) {
                onChange(reorder(list, dragging, index));
                setDragging(index);
            }
        },
        onKeyMove: (offset) => {
            const target = index + offset;

            if (target < 0 || target >= list.length) {
                return;
            }

            onChange(reorder(list, index, target));
        },
    });
}

/**
 * Tracks which repeated entries are expanded. Existing rows start collapsed;
 * call `expand(index)` after Add so the new empty card opens for typing.
 */
export function useExpandedEntries(): {
    isExpanded: (index: number) => boolean;
    toggle: (index: number) => void;
    expand: (index: number) => void;
    remapAfterRemove: (removedIndex: number) => void;
} {
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

    return {
        isExpanded: (index) => expanded.has(index),
        toggle: (index) => {
            setExpanded((current) => {
                const next = new Set(current);

                if (next.has(index)) {
                    next.delete(index);
                } else {
                    next.add(index);
                }

                return next;
            });
        },
        expand: (index) => {
            setExpanded((current) => new Set(current).add(index));
        },
        remapAfterRemove: (removedIndex) => {
            setExpanded((current) => {
                const next = new Set<number>();

                for (const index of current) {
                    if (index < removedIndex) {
                        next.add(index);
                    } else if (index > removedIndex) {
                        next.add(index - 1);
                    }
                }

                return next;
            });
        },
    };
}

/** One repeated entry — collapsed to a summary row until expanded to edit. */
export function EntryCard({
    title,
    summary,
    expanded,
    onToggleExpand,
    onRemove,
    children,
    dragHandle,
}: {
    title: string;
    /** Shown under the title while collapsed (company · dates, etc.). */
    summary?: string;
    expanded: boolean;
    onToggleExpand: () => void;
    onRemove: () => void;
    children: ReactNode;
    dragHandle?: EntryDragHandle;
}) {
    const contentId = useId();

    return (
        <div
            onDragOver={dragHandle?.onDragOver}
            className={cn(
                'flex flex-col rounded-lg border border-surface-border bg-white',
                'transition-opacity duration-soft ease-soft',
                dragHandle?.dragging && 'opacity-50',
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5',
                    expanded && 'border-b border-surface-border/80',
                )}
            >
                {dragHandle && (
                    <button
                        type="button"
                        draggable
                        onDragStart={dragHandle.onDragStart}
                        onDragEnd={dragHandle.onDragEnd}
                        onKeyDown={(event) => {
                            // Alt+↑/↓ reorders without leaving the keyboard.
                            if (
                                event.altKey &&
                                (event.key === 'ArrowUp' ||
                                    event.key === 'ArrowDown')
                            ) {
                                event.preventDefault();
                                dragHandle.onKeyMove(
                                    event.key === 'ArrowUp' ? -1 : 1,
                                );
                            }
                        }}
                        className="cursor-grab p-0.5 text-ink-faint focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/40 active:cursor-grabbing"
                        aria-label={`Reorder ${title} — drag, or Alt+Arrow keys`}
                    >
                        <Bars3Icon className="size-3.5" />
                    </button>
                )}
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={onToggleExpand}
                    className="focus-ring flex min-w-0 flex-1 items-start gap-1.5 rounded-sm text-left"
                >
                    <ChevronDownIcon
                        className={cn(
                            'mt-0.5 size-3.5 shrink-0 text-ink-faint transition-transform duration-soft ease-soft',
                            !expanded && '-rotate-90',
                        )}
                    />
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold tracking-[0.06em] text-ink-faint uppercase">
                            {title}
                        </span>
                        {!expanded && summary ? (
                            <span className="mt-0.5 block truncate text-xs font-normal tracking-normal text-ink-muted normal-case">
                                {summary}
                            </span>
                        ) : null}
                    </span>
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${title}`}
                    onClick={onRemove}
                    className="size-7 shrink-0 text-ink-faint hover:text-danger"
                >
                    <TrashIcon className="size-3.5" />
                </Button>
            </div>
            {expanded ? (
                <div id={contentId} className="flex flex-col gap-2.5 p-3">
                    {children}
                </div>
            ) : null}
        </div>
    );
}

export function AddButton({
    label,
    onClick,
    disabled = false,
    disabledReason,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** Shown under the button when `disabled` — e.g. "Limit reached (20)". */
    disabledReason?: string;
}) {
    return (
        <div className="flex flex-col items-start gap-1">
            <Button
                variant="outline"
                size="sm"
                onClick={onClick}
                disabled={disabled}
                className="self-start border-dashed border-surface-border text-ink-muted hover:border-brand hover:text-brand"
            >
                <PlusIcon className="size-3.5" /> {label}
            </Button>
            {disabled && disabledReason && (
                <p className="text-xs text-ink-faint">{disabledReason}</p>
            )}
        </div>
    );
}
