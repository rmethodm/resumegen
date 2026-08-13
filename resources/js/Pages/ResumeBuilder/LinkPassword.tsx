import PublicLayout from '@/Layouts/PublicLayout';
import { Head, useForm } from '@inertiajs/react';

export default function LinkPassword({ token, label }: { token: string; label: string | null }) {
    const form = useForm({ password: '' });

    return (
        <PublicLayout>
            <Head title="Password required" />
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-sm px-6 text-center">
                    <div className="mb-6 text-5xl">🔒</div>
                    <h1 className="mb-3 text-2xl font-semibold text-gray-800">This resume is password protected</h1>
                    <p className="mb-6 text-sm leading-relaxed text-gray-500">
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
                        <input
                            type="password"
                            autoFocus
                            value={form.data.password}
                            onChange={e => form.setData('password', e.target.value)}
                            placeholder="Password"
                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        {form.errors.password && (
                            <p className="mt-2 text-xs text-red-500">{form.errors.password}</p>
                        )}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            View resume
                        </button>
                    </form>
                </div>
            </div>
        </PublicLayout>
    );
}
