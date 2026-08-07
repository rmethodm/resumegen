import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

/** Length + variety heuristic — no external strength library needed for a
 * three-band hint. */
function passwordStrength(password: string): {
    label: string;
    className: string;
} | null {
    if (!password) return null;

    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) =>
        re.test(password),
    ).length;

    if (password.length < 8) {
        return { label: 'Weak — use at least 8 characters', className: 'text-error-text' };
    }
    if (password.length < 12 || variety < 2) {
        return { label: 'Fair', className: 'text-warning-text' };
    }
    return { label: 'Strong', className: 'text-success-text' };
}

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const strength = useMemo(() => passwordStrength(data.password), [data.password]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthSplitLayout
            panelTitle="Build a resume that scores as you write."
            panelBody="Nine ATS-friendly templates, live scoring with named reasons, PDF and DOCX export — every feature free, no plan."
        >
            <Head title="Register" />

            <h1 className="mb-1 text-center text-xl font-bold text-text-primary">
                Create your account
            </h1>
            <p className="mb-6 text-center text-sm text-text-secondary">
                Start building a resume that gets noticed.
            </p>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <div className="relative mt-1">
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pr-10"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
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

                    {strength && !errors.password && (
                        <p className={`mt-1.5 text-xs ${strength.className}`}>
                            {strength.label}
                        </p>
                    )}
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm password"
                    />

                    <div className="relative mt-1">
                        <TextInput
                            id="password_confirmation"
                            type={showConfirm ? 'text' : 'password'}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full pr-10"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-tertiary transition-transform hover:text-text-secondary active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            {showConfirm ? (
                                <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                                <EyeIcon className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <label className="mt-4 flex items-start gap-2 text-xs text-text-secondary">
                    <Checkbox className="mt-0.5" required />
                    <span>
                        I agree to the Terms of Service and Privacy Policy
                    </span>
                </label>

                <PrimaryButton className="mt-4 w-full justify-center" disabled={processing}>
                    {processing ? 'Creating account…' : 'Create account'}
                </PrimaryButton>
                <p className="mt-2 text-center text-xs text-text-tertiary">
                    We'll send a verification link to confirm your email.
                </p>

                <p className="mt-4 text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link href={route('login')} className="font-bold text-text-primary">
                        Log in
                    </Link>
                </p>
            </form>
        </AuthSplitLayout>
    );
}
