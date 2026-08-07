import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { flash } = usePage().props as {
        flash?: { success?: string | null; error?: string | null };
    };
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true as boolean,
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthSplitLayout>
            <Head title="Log in" />

            <h1 className="mb-1 text-center text-xl font-bold text-text-primary">
                Welcome back
            </h1>
            <p className="mb-6 text-center text-sm text-text-secondary">
                Log in to keep building your resume.
            </p>

            {status && (
                <div className="mb-4 flex items-center gap-1.5 text-sm font-medium text-success-text">
                    <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {status}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 flex items-start gap-1.5 rounded-md border border-error-border bg-error-bg px-3 py-2 text-sm font-medium text-error-text">
                    <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {flash.error}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                        <InputLabel htmlFor="password" value="Password" />

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="rounded-md text-xs text-text-secondary underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    <div className="relative mt-1">
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pr-10"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-tertiary transition-transform hover:text-text-secondary active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                                <EyeIcon className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <label className="mt-4 flex items-center">
                    <Checkbox
                        name="remember"
                        checked={data.remember}
                        onChange={(e) =>
                            setData(
                                'remember',
                                (e.target.checked || false) as false,
                            )
                        }
                    />
                    <span className="ms-2 text-sm text-text-secondary">
                        Remember me
                    </span>
                </label>

                <PrimaryButton className="mt-6 w-full justify-center" disabled={processing}>
                    {processing ? 'Logging in…' : 'Log in'}
                </PrimaryButton>

                <p className="mt-4 text-center text-sm text-text-secondary">
                    No account yet?{' '}
                    <Link href={route('register')} className="font-bold text-text-primary">
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthSplitLayout>
    );
}
