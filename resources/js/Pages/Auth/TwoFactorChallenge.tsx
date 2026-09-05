import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';

type Mode = 'totp' | 'recovery';

export default function TwoFactorChallenge() {
    const [mode, setMode] = useState<Mode>('totp');
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.challenge.store'));
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Authentication" />

            <div className="mb-4 text-sm text-ink-muted">
                {mode === 'recovery'
                    ? 'Enter one of your emergency recovery codes.'
                    : 'Enter the 6-digit code from your authenticator app.'}
            </div>

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
                    <Button disabled={processing}>Verify</Button>
                </div>
            </form>

            <div className="mt-4 space-y-2 text-center text-sm">
                {mode !== 'recovery' && (
                    <button
                        type="button"
                        className="focus-ring rounded-sm text-ink-muted underline hover:text-ink"
                        onClick={() => setMode('recovery')}
                    >
                        Use a recovery code instead
                    </button>
                )}
                {mode === 'recovery' && (
                    <button
                        type="button"
                        className="focus-ring rounded-sm text-ink-muted underline hover:text-ink"
                        onClick={() => setMode('totp')}
                    >
                        Use authenticator app instead
                    </button>
                )}
                <div>
                    <a
                        href={route('logout')}
                        onClick={(e) => {
                            e.preventDefault();
                            router.post(route('logout'));
                        }}
                        className="focus-ring rounded-sm text-ink-muted underline hover:text-ink"
                    >
                        Sign out
                    </a>
                </div>
            </div>
        </GuestLayout>
    );
}
