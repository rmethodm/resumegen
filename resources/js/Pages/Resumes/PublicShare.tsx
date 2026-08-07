import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import type { Resume } from '@/types';

/**
 * The read-only page a recruiter sees when opening a shared link (design
 * doc turn 6, option 6a's counterpart page). No messaging, no login.
 * Light Resumegen mark only — not a marketing shell.
 */
export default function PublicShare({
    token,
    locked,
    requireEmail,
    requirePassword,
    allowDownload,
    resume,
}: {
    token: string;
    locked: boolean;
    requireEmail: boolean;
    requirePassword: boolean;
    allowDownload: boolean;
    resume: Resume | null;
}) {
    if (locked || resume === null) {
        return (
            <AccessGate
                token={token}
                requireEmail={requireEmail}
                requirePassword={requirePassword}
            />
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-surface">
            <Head title={`${resume.full_name}'s resume`} />

            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <BrandMark />
                    <span className="truncate text-sm font-medium text-gray-500">
                        Shared by {resume.full_name}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => window.print()}>
                        Print
                    </Button>
                    {allowDownload && (
                        <>
                            <a
                                href={route('share.docx', token)}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                            >
                                Download DOCX
                            </a>
                            <a
                                href={route('share.pdf', token)}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-accent-bg px-4 text-sm font-medium text-white shadow-sm hover:bg-accent-bg-active focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-1"
                            >
                                Download PDF
                            </a>
                        </>
                    )}
                </div>
            </header>

            <main className="flex flex-1 justify-center p-4 sm:p-8">
                <ResumePreview resume={resume} />
            </main>

            <BrandFooter />
        </div>
    );
}

function AccessGate({
    token,
    requireEmail,
    requirePassword,
}: {
    token: string;
    requireEmail: boolean;
    requirePassword: boolean;
}) {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('share.unlock', token));
    };

    return (
        <div className="flex min-h-screen flex-col bg-surface">
            <Head title="Enter your details to view this resume" />

            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
                <div className="mb-6">
                    <BrandMark size="md" />
                </div>

                <form
                    onSubmit={submit}
                    className="w-full max-w-sm rounded-lg border border-surface-border bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                    <h1 className="text-sm font-bold text-gray-900">
                        Enter your details to view this resume
                    </h1>
                    <p className="mt-1 text-xs text-gray-500">
                        The sender has restricted who can view this link.
                    </p>

                    {requireEmail && (
                        <>
                            <label
                                htmlFor="share-gate-email"
                                className="mt-4 block text-xs font-medium text-gray-700"
                            >
                                Email
                            </label>
                            <Input
                                id="share-gate-email"
                                type="email"
                                required
                                autoFocus
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-1"
                                placeholder="you@example.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                            )}
                        </>
                    )}

                    {requirePassword && (
                        <>
                            <label
                                htmlFor="share-gate-password"
                                className="mt-4 block text-xs font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <Input
                                id="share-gate-password"
                                type="password"
                                required
                                autoFocus={!requireEmail}
                                maxLength={8}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-1"
                                placeholder="Password"
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                            )}
                        </>
                    )}

                    <Button type="submit" disabled={processing} className="mt-4 w-full">
                        Continue
                    </Button>
                </form>
            </div>

            <BrandFooter />
        </div>
    );
}

/** Same mark language as the app chrome — quiet, not a billboard. */
function BrandMark({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const box = size === 'md' ? 'h-8 w-8' : 'h-[22px] w-[22px]';
    const type = size === 'md' ? 'text-[15px]' : 'text-[13px]';

    return (
        <div className="flex items-center gap-2">
            <div
                className={`${box} flex-shrink-0 rounded-md bg-gradient-to-br from-accent-500 to-accent-700`}
                aria-hidden
            />
            <span className={`${type} font-extrabold tracking-tight text-gray-900`}>
                Resumegen
            </span>
        </div>
    );
}

function BrandFooter() {
    return (
        <footer className="border-t border-gray-100 px-4 py-3 text-center">
            <p className="text-[11px] text-gray-400">
                Shared with{' '}
                <a
                    href="/"
                    className="font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                >
                    Resumegen
                </a>
            </p>
        </footer>
    );
}
