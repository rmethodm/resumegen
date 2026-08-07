import { CheckCircleIcon } from '@heroicons/react/24/outline';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthCenteredLayout from '@/Layouts/AuthCenteredLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Mode = 'totp' | 'recovery' | 'email';

export default function TwoFactorChallenge({ emailSent }: { emailSent: boolean }) {
    const [mode, setMode] = useState<Mode>('totp');
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.challenge.store'));
    };

    const sendEmail = () => {
        router.post(route('two-factor.challenge.email'), {}, {
            onSuccess: () => setMode('email'),
        });
    };

    return (
        <AuthCenteredLayout>
            <Head title="Two-Factor Authentication" />

            <div className="mb-4 text-sm text-text-secondary">
                {mode === 'recovery'
                    ? 'Enter one of your emergency recovery codes.'
                    : mode === 'email'
                    ? 'Enter the 6-digit code sent to your email address.'
                    : 'Enter the 6-digit code from your authenticator app.'}
            </div>

            {emailSent && mode !== 'email' && (
                <div className="mb-4 flex items-center gap-1.5 text-sm text-success-text">
                    <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    A code has been sent to your email.
                </div>
            )}

            <form onSubmit={submit}>
                {mode === 'recovery' ? (
                    <TextInput
                        id="code"
                        type="text"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full"
                        autoComplete="off"
                        isFocused
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="XXXXX-XXXXX"
                    />
                ) : (
                    <TextInput
                        id="code"
                        type="text"
                        inputMode="numeric"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full tracking-widest text-center text-xl"
                        autoComplete="one-time-code"
                        isFocused
                        maxLength={6}
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="000000"
                    />
                )}

                <InputError message={errors.code} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing}>Verify</PrimaryButton>
                </div>
            </form>

            <div className="mt-4 space-y-2 text-center text-sm">
                {mode !== 'recovery' && (
                    <button
                        type="button"
                        className="text-text-secondary underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded-md"
                        onClick={() => setMode('recovery')}
                    >
                        Use a recovery code instead
                    </button>
                )}
                {mode === 'recovery' && (
                    <button
                        type="button"
                        className="text-text-secondary underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded-md"
                        onClick={() => setMode('totp')}
                    >
                        Use authenticator app instead
                    </button>
                )}
                {mode !== 'email' && (
                    <div>
                        <button
                            type="button"
                            className="text-text-secondary underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded-md"
                            onClick={sendEmail}
                        >
                            Send code to my email instead
                        </button>
                    </div>
                )}
                <div>
                    <a
                        href={route('logout')}
                        onClick={(e) => {
                            e.preventDefault();
                            router.post(route('logout'));
                        }}
                        className="text-text-secondary underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded-md"
                    >
                        Sign out
                    </a>
                </div>
            </div>
        </AuthCenteredLayout>
    );
}
