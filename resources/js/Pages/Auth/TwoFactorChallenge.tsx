import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';

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

            <div className="mb-4 text-sm text-muted-foreground">
                {mode === 'recovery'
                    ? 'Enter one of your emergency recovery codes.'
                    : 'Enter the 6-digit code from your authenticator app.'}
            </div>

            <form onSubmit={submit}>
                {mode === 'recovery' ? (
                    <Input
                        id="code"
                        type="text"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full"
                        autoComplete="off"
                        autoFocus
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="XXXXX-XXXXX"
                    />
                ) : (
                    <Input
                        id="code"
                        type="text"
                        inputMode="numeric"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full tracking-widest text-center text-xl"
                        autoComplete="one-time-code"
                        autoFocus
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
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-muted-foreground"
                        onClick={() => setMode('recovery')}
                    >
                        Use a recovery code instead
                    </Button>
                )}
                {mode === 'recovery' && (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-muted-foreground"
                        onClick={() => setMode('totp')}
                    >
                        Use authenticator app instead
                    </Button>
                )}
                <div>
                    <a
                        href={route('logout')}
                        onClick={(e) => {
                            e.preventDefault();
                            router.post(route('logout'));
                        }}
                        className="focus-ring rounded-sm text-muted-foreground underline hover:text-foreground"
                    >
                        Sign out
                    </a>
                </div>
            </div>
        </GuestLayout>
    );
}
