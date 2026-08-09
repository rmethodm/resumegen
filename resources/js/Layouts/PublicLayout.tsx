import { PropsWithChildren } from 'react';

export default function PublicLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="mx-auto max-w-5xl px-4 py-3">
                    <span className="text-sm font-semibold text-indigo-600">ResumeGen</span>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
