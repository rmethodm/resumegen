import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { Shell } from '@/Components/ui/shell';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-[100dvh] flex-col items-center bg-surface px-4 pt-10 sm:justify-center sm:pt-0">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand shadow-shell" />
                <span className="text-xl font-extrabold tracking-tight text-ink">Resumegen</span>
            </Link>
            <Shell className="w-full sm:max-w-md" innerClassName="px-8 py-7">
                {children}
            </Shell>
        </div>
    );
}
