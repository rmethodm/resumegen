import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Head, useForm } from '@inertiajs/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function LinkPassword({ token, label }: { token: string; label: string | null }) {
    const form = useForm({ password: '' });

    return (
        <PublicLayout>
            <Head title="Password required" />
            <div className="flex min-h-screen items-center justify-center bg-surface">
                <div className="w-full max-w-sm px-6 text-center">
                    <LockClosedIcon className="mx-auto mb-6 size-10 text-ink-faint" />

                    <h1 className="mb-3 text-2xl font-semibold text-ink">This resume is password protected</h1>
                    <p className="mb-6 text-sm leading-relaxed text-ink-muted">
                        {label
                            ? `Enter the password you were given for "${label}".`
                            : 'Enter the password you were given to view it.'}
                    </p>

                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            form.post(route('public.resume.unlock', token), {
                                onFinish: () => form.reset('password'),
                            });
                        }}
                    >
                        <Input
                            type="password"
                            autoFocus
                            value={form.data.password}
                            onChange={e => form.setData('password', e.target.value)}
                            placeholder="Password"
                        />
                        {form.errors.password && (
                            <p className="mt-2 text-xs text-danger">{form.errors.password}</p>
                        )}
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="mt-4 w-full rounded-lg"
                        >
                            View resume
                        </Button>
                    </form>
                </div>
            </div>
        </PublicLayout>
    );
}
