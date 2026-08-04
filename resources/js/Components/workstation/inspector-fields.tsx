import { Bars3Icon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
                            <span className="text-[9px] font-semibold text-gray-500">
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
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    error?: string | null;
    placeholder?: string;
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
                onChange={(event) => onChange(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={show}
                aria-describedby={show ? messageId : undefined}
            />
            {show && (
                <p
                    id={messageId}
                    role="alert"
                    className="text-[11px] text-red-600"
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
                'h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50',
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
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{label}</Label>
            {/* Sized to their contents rather than split down the panel — a
                three-letter month and a four-digit year read as one date only
                when they sit together. */}
            <div className="flex gap-2">
                <PartSelect
                    value={month}
                    options={monthNames}
                    disabled={disabled}
                    className="w-28"
                    placeholder={presentLabel ? 'Present' : 'Month'}
                    onChange={(next) => onChange(joinMonthYear(next, year))}
                />
                <PartSelect
                    value={year}
                    options={years}
                    disabled={disabled}
                    className="w-24"
                    placeholder={presentLabel ? '' : 'Year'}
                    onChange={(next) => onChange(joinMonthYear(month, next))}
                />
            </div>
            {unparsed !== '' && (
                <p className="text-[11px] text-gray-500">
                    Currently “{unparsed}”. Picking a month or year replaces it.
                </p>
            )}
        </div>
    );
}

export function Pair({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/** Drag affordance for one entry in a reorderable list — see `useEntryReorder`. */
type EntryDragHandle = {
    dragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
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
    });
}

/** One repeated entry, with the controls that remove and (optionally) reorder it. */
export function EntryCard({
    title,
    onRemove,
    children,
    dragHandle,
}: {
    title: string;
    onRemove: () => void;
    children: ReactNode;
    dragHandle?: EntryDragHandle;
}) {
    return (
        <div
            onDragOver={dragHandle?.onDragOver}
            className={cn(
                'flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5',
                dragHandle?.dragging && 'opacity-50',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {dragHandle && (
                        <span
                            draggable
                            onDragStart={dragHandle.onDragStart}
                            onDragEnd={dragHandle.onDragEnd}
                            className="cursor-grab p-0.5 text-gray-500 active:cursor-grabbing"
                            aria-label={`Reorder ${title}`}
                        >
                            <Bars3Icon className="size-3.5" />
                        </span>
                    )}
                    <p className="text-[11px] font-bold tracking-[0.06em] text-gray-500 uppercase">
                        {title}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${title}`}
                    onClick={onRemove}
                    className="size-7 text-gray-500 hover:text-red-600"
                >
                    <TrashIcon className="size-3.5" />
                </Button>
            </div>
            {children}
        </div>
    );
}

export function AddButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="self-start"
        >
            <PlusIcon className="size-4" /> {label}
        </Button>
    );
}

/**
 * One row per bullet, reorderable by dragging the grip. The leading "• " some
 * people type is stripped so it doesn't get stored twice, and pasting several
 * lines at once splits into one bullet per line.
 */
export function BulletsField({
    label,
    value,
    onChange,
    idPrefix,
}: {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    /** When set, each bullet input gets id `${idPrefix}-${index}` for jump-to. */
    idPrefix?: string;
}) {
    // ponytail: native HTML5 drag, no dnd library. Swap in one if touch matters.
    const [dragging, setDragging] = useState<number | null>(null);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    // A pending focus target, not rendered state — a ref so applying it clears
    // it without a setState-in-effect. Keyed on `value` below: focus follows the
    // re-render that onChange triggers.
    const pendingFocus = useRef<number | null>(null);

    /** Enter and Backspace shift which row exists, so focus follows the re-render. */
    useEffect(() => {
        const index = pendingFocus.current;

        if (index === null) {
            return;
        }

        pendingFocus.current = null;

        const input = inputs.current[index];

        input?.focus();
        input?.setSelectionRange(input.value.length, input.value.length);
    }, [value]);

    function replace(index: number, lines: string[]) {
        onChange(value.flatMap((line, at) => (at === index ? lines : [line])));
    }

    function insertAfter(index: number) {
        onChange(
            value.flatMap((line, at) => (at === index ? [line, ''] : [line])),
        );
        pendingFocus.current = index + 1;
    }

    function removeAt(index: number, focus: number | null = null) {
        onChange(value.filter((_, at) => at !== index));
        pendingFocus.current = focus;
    }

    function move(from: number, to: number) {
        onChange(reorder(value, from, to));
    }

    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{label}</Label>
            {value.map((bullet, index) => (
                <div
                    key={index}
                    className="flex items-center gap-1"
                    onDragOver={(event) => {
                        event.preventDefault();

                        if (dragging !== null && dragging !== index) {
                            move(dragging, index);
                            setDragging(index);
                        }
                    }}
                >
                    <span
                        draggable
                        onDragStart={() => setDragging(index)}
                        onDragEnd={() => setDragging(null)}
                        className="cursor-grab p-1 text-gray-500 active:cursor-grabbing"
                        aria-label="Reorder bullet"
                    >
                        <Bars3Icon className="size-3.5" />
                    </span>
                    <Input
                        ref={(element) => {
                            inputs.current[index] = element;
                        }}
                        id={
                            idPrefix !== undefined
                                ? `${idPrefix}-${index}`
                                : undefined
                        }
                        value={bullet}
                        onChange={(event) =>
                            replace(
                                index,
                                event.target.value
                                    .split('\n')
                                    .map((line) =>
                                        line.replace(/^\s*[•\-*]\s*/, ''),
                                    ),
                            )
                        }
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                insertAfter(index);
                            }

                            // Backspace in an empty row deletes it, landing the
                            // caret at the end of the row above.
                            if (
                                event.key === 'Backspace' &&
                                bullet === '' &&
                                value.length > 1
                            ) {
                                event.preventDefault();
                                removeAt(index, Math.max(0, index - 1));
                            }
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-gray-500"
                        onClick={() => removeAt(index)}
                        aria-label="Remove bullet"
                    >
                        <XMarkIcon className="size-3.5" />
                    </Button>
                </div>
            ))}
            <Button
                variant="link"
                size="sm"
                className="h-auto self-start p-0 text-xs"
                onClick={() => onChange([...value, ''])}
            >
                + Add bullet
            </Button>
        </div>
    );
}
