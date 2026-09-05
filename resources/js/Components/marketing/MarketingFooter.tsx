import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';

const COLUMNS = [
    {
        heading: 'Product',
        links: [
            { label: 'Templates', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
        ],
    },
] as const;

export function MarketingFooter() {
    return (
        <footer className="border-t border-surface-border/80 px-4 py-12 sm:px-6">
            <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                    <BrandMark href="/" size="md" />
                    <p className="mt-3 max-w-60 text-sm leading-relaxed text-ink-muted">
                        A resume builder with everything included and nothing behind a paywall.
                    </p>
                </div>
                {COLUMNS.map((column) => (
                    <div key={column.heading}>
                        <h3 className="text-sm font-bold text-ink">{column.heading}</h3>
                        <ul className="mt-3.5 space-y-2.5">
                            {column.links.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="focus-ring rounded-sm text-sm text-ink-muted hover:text-ink hover:underline"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                <div>
                    <h3 className="text-sm font-bold text-ink">Legal</h3>
                    <ul className="mt-3.5 space-y-2.5">
                        <li>
                            <Link
                                href={route('legal.privacy')}
                                className="focus-ring rounded-sm text-sm text-ink-muted hover:text-ink hover:underline"
                            >
                                Privacy
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={route('legal.terms')}
                                className="focus-ring rounded-sm text-sm text-ink-muted hover:text-ink hover:underline"
                            >
                                Terms
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between border-t border-surface-border/60 pt-6">
                <span className="text-xs text-ink-faint">
                    © {new Date().getFullYear()} Resumegen. All rights reserved.
                </span>
                <span className="text-xs text-ink-faint">Free forever — really.</span>
            </div>
        </footer>
    );
}
