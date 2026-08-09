import { PropsWithChildren } from 'react';

export default function PublicLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-surface-canvas">
            <header className="bg-surface-card shadow-sm">
                <div className="mx-auto max-w-5xl px-4 py-3">
                    <span className="text-sm font-semibold text-accent-text">ResumeGen</span>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
