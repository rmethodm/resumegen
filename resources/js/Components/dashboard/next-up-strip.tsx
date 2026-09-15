import { Link } from '@inertiajs/react';
import { BellAlertIcon, CalendarDaysIcon, DocumentPlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Shell } from '@/Components/ui/shell';
import type { NextUpItem } from '@/types';

const ICON: Record<NextUpItem['kind'], typeof BellAlertIcon> = {
    follow_up: BellAlertIcon,
    interview: CalendarDaysIcon,
    unattached: DocumentPlusIcon,
    pending_suggestions: SparklesIcon,
};

export function NextUpStrip({ items }: { items: NextUpItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <Shell innerClassName="p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Next up</p>
            <ul className="mt-3 divide-y divide-surface-border/80">
                {items.map((item, index) => {
                    const Icon = ICON[item.kind];
                    return (
                        <li key={`${item.kind}-${index}`}>
                            <Link
                                href={item.href}
                                className="flex items-center gap-3 py-2.5 hover:bg-surface/60"
                            >
                                <Icon className="size-4 shrink-0 text-brand" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                                    <span className="block text-xs text-ink-muted">{item.detail}</span>
                                </span>
                                <span className="text-ink-faint">→</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </Shell>
    );
}
