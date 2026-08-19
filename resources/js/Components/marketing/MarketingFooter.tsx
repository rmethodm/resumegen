import { Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';

export function MarketingFooter() {
    return (
        <footer className="border-t border-surface-border/80 px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                <BrandMark href="/" size="sm" />
                <span className="text-xs text-ink-faint">
                    © {new Date().getFullYear()} Resumegen. All rights reserved.
                </span>
                <div className="flex gap-5 text-xs text-ink-muted">
                    <Link href={route('legal.privacy')} className="hover:text-ink hover:underline">
                        Privacy
                    </Link>
                    <Link href={route('legal.terms')} className="hover:text-ink hover:underline">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
