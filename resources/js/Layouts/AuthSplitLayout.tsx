import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/**
 * Split-panel auth shell (sign-in / sign-up only). Panel is a tinted
 * neutral surface, never a full-saturation brand flood — panel copy is
 * limited to facts already true of the product (brief §4 "Free means
 * free"), not invented metrics or quotes we can't source.
 */
export default function AuthSplitLayout({
    children,
    panelTitle = 'Pick up where you left off.',
    panelBody = '9 ATS-friendly templates, live scoring as you write, and exports with no watermark — every feature, free.',
}: PropsWithChildren<{
    panelTitle?: string;
    panelBody?: string;
}>) {
    return (
        <div className="flex min-h-screen bg-surface-canvas">
            <div className="relative hidden w-[42%] max-w-md shrink-0 flex-col justify-between overflow-hidden bg-surface-raised px-10 py-10 md:flex">
                <DocumentTextIcon
                    className="pointer-events-none absolute -right-16 -bottom-16 h-80 w-80 text-accent-bg/[0.06]"
                    aria-hidden="true"
                />

                <Link href="/" className="relative flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-bg text-sm font-semibold text-text-on-accent">
                        R
                    </span>
                    <span className="text-lg font-semibold tracking-tight text-text-primary">
                        Resumegen
                    </span>
                </Link>

                <div className="relative">
                    <h2 className="mb-3 text-2xl font-semibold tracking-tight text-text-primary [text-wrap:balance]">
                        {panelTitle}
                    </h2>
                    <p className="text-sm leading-relaxed text-text-secondary">{panelBody}</p>
                </div>

                <p className="relative text-xs text-text-tertiary">
                    Free forever. No credit card, no upsell.
                </p>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
                <div className="w-full max-w-[400px]">
                    <Link
                        href="/"
                        className="mb-6 flex items-center justify-center gap-2.5 md:hidden"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-bg text-sm font-semibold text-text-on-accent">
                            R
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-text-primary">
                            Resumegen
                        </span>
                    </Link>

                    <div className="rounded-xl border border-border-subtle bg-surface-card px-8 py-7 shadow-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
