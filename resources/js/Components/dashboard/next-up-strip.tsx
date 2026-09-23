import { Link } from '@inertiajs/react';
import { BellAlertIcon, CalendarDaysIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { Card } from '@/Components/ui/card';
import type { NextUpItem } from '@/types';

const ICON: Record<NextUpItem['kind'], typeof BellAlertIcon> = {
    follow_up: BellAlertIcon,
    interview: CalendarDaysIcon,
    unattached: DocumentPlusIcon,
    prepare: DocumentPlusIcon,
};

export function NextUpStrip({ items }: { items: NextUpItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <Card className="gap-0 p-4 py-0 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Next up</p>
            <ul className="mt-3 divide-y divide-border/80">
                {items.map((item, index) => {
                    const Icon = ICON[item.kind];
                    return (
                        <li key={`${item.kind}-${index}`}>
                            <Link
                                href={item.href}
                                className="flex items-center gap-3 py-2.5 hover:bg-muted/60"
                            >
                                <Icon className="size-4 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
                                    <span className="block text-xs text-muted-foreground">{item.detail}</span>
                                </span>
                                <span className="text-muted-foreground/70">→</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
