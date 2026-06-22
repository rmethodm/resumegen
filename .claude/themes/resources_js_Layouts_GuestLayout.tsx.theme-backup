import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-[#f5f5fb] pt-10 sm:justify-center sm:pt-0">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                <span className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Resumegen</span>
            </Link>
            <div className="w-full overflow-hidden rounded-2xl border border-[#eeeef5] bg-white px-8 py-7 shadow-[0_4px_24px_rgba(79,70,229,0.08)] sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
