import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { BrandMark } from '@/Components/BrandMark';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { Resume } from '@/types';

/**
 * The read-only page a recruiter sees when opening a shared link.
 * Document-stage layout: quiet brand chrome, resume as the hero object.
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
        <div className="flex min-h-[100dvh] flex-col bg-surface">
            <Head title={`${resume.full_name}'s resume`} />

            <div
                className={cn(
                    'sticky top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4',
                    '[padding-top:max(0.75rem,env(safe-area-inset-top))]',
                )}
            >
                <header
                    className={cn(
                        'mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3',
                        'rounded-2xl border border-surface-border/80 bg-white/90 px-4 py-3 shadow-ambient backdrop-blur-xl',
                    )}
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <BrandMark href="/" size="sm" />
                        <span className="truncate text-sm font-medium text-ink-muted">
                            Shared by {resume.full_name}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => window.print()}>
                            Print
                        </Button>
                        {allowDownload && (
                            <>
                                <a
                                    href={route('share.docx', token)}
                                    className={cn(buttonClassName('outline', 'default'), 'rounded-full')}
                                >
                                    Download DOCX
                                </a>
                                <a
                                    href={route('share.pdf', token)}
                                    className={cn(buttonClassName('default', 'default'), 'rounded-full')}
                                >
                                    Download PDF
                                </a>
                            </>
                        )}
                    </div>
                </header>
            </div>

            <main className="flex flex-1 justify-center px-3 py-6 sm:px-6 sm:py-10">
                <Shell
                    className="w-full max-w-[8.5in]"
                    innerClassName="overflow-hidden bg-white p-3 sm:p-5"
                >
                    <div className="rounded-md bg-white shadow-card ring-1 ring-ink/5">
                        <ResumePreview resume={resume} />
                    </div>
                </Shell>
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
        <div className="flex min-h-[100dvh] flex-col bg-surface">
            <Head title="Enter your details to view this resume" />

            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
                <div className="mb-6">
                    <BrandMark href="/" size="md" />
                </div>

                <Shell className="w-full max-w-sm" innerClassName="p-6">
                    <form onSubmit={submit}>
                        <h1 className="text-sm font-bold text-ink">
                            Enter your details to view this resume
                        </h1>
                        <p className="mt-1 text-xs text-ink-muted">
                            The sender has restricted who can view this link.
                        </p>

                        {requireEmail && (
                            <>
                                <label
                                    htmlFor="share-gate-email"
                                    className="mt-4 block text-xs font-medium text-ink"
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
                                    <p className="mt-1 text-xs text-danger">{errors.email}</p>
                                )}
                            </>
                        )}

                        {requirePassword && (
                            <>
                                <label
                                    htmlFor="share-gate-password"
                                    className="mt-4 block text-xs font-medium text-ink"
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
                                    <p className="mt-1 text-xs text-danger">{errors.password}</p>
                                )}
                            </>
                        )}

                        <Button type="submit" disabled={processing} className="mt-4 w-full rounded-full">
                            Continue
                        </Button>
                    </form>
                </Shell>
            </div>

            <BrandFooter />
        </div>
    );
}

function BrandFooter() {
    return (
        <footer className="px-4 py-4 text-center">
            <p className="text-xs text-ink-faint">
                Shared with{' '}
                <a
                    href="/"
                    className="font-medium text-ink-muted underline-offset-2 transition-colors duration-soft ease-soft hover:text-ink hover:underline"
                >
                    Resumegen
                </a>
                {' · '}
                <a href={route('legal.privacy')} className="hover:text-ink hover:underline">
                    Privacy
                </a>
            </p>
        </footer>
    );
}
