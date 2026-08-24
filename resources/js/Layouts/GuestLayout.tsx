import { PropsWithChildren } from 'react';
import { BrandMark } from '@/Components/BrandMark';
import { Shell } from '@/Components/ui/shell';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-dvh flex-col items-center bg-surface px-4 pt-10 sm:justify-center sm:pt-0">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-ambient"
            >
                Skip to content
            </a>
            <div className="mb-6">
                <BrandMark href="/" size="lg" />
            </div>
            <Shell className="w-full sm:max-w-md" innerClassName="px-8 py-7">
                <div id="main-content" tabIndex={-1}>
                    {children}
                </div>
            </Shell>
        </div>
    );
}
