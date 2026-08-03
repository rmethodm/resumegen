import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { ResumePreview } from '@/Components/resume/resume-preview';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import type { Resume } from '@/types';

/**
 * The read-only page a recruiter sees when opening a shared link (design
 * doc turn 6, option 6a's counterpart page). No messaging, no login.
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
            <AccessGate token={token} requireEmail={requireEmail} requirePassword={requirePassword} />
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            <Head title={`${resume.full_name}'s resume`} />

            <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
                <span className="text-sm font-medium text-gray-500">
                    Shared by {resume.full_name}
                </span>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => window.print()}>
                        Print
                    </Button>
                    {allowDownload && (
                        <>
                            <a
                                href={route('share.docx', token)}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-surface"
                            >
                                Download DOCX
                            </a>
                            <a
                                href={route('share.pdf', token)}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-accent"
                            >
                                Download PDF
                            </a>
                        </>
                    )}
                </div>
            </header>

            <main className="flex justify-center p-8">
                <ResumePreview resume={resume} />
            </main>
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
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
            <Head title="Enter your details to view this resume" />

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
                        <Input
                            type="email"
                            required
                            autoFocus
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-4"
                            placeholder="you@example.com"
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                        )}
                    </>
                )}

                {requirePassword && (
                    <>
                        <Input
                            type="password"
                            required
                            autoFocus={!requireEmail}
                            maxLength={8}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="mt-4"
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
    );
}
