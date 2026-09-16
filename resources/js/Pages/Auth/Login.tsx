import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { SocialLoginButtons } from '@/Components/auth/SocialLoginButtons';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription } from '@/Components/ui/alert';

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <h1 className="mb-1 text-center text-xl font-bold text-ink">
                Welcome back
            </h1>
            <p className="mb-6 text-center text-sm text-ink-muted">
                Log in to keep building your resume.
            </p>

            {status && (
                <Alert className="mb-4">
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}
            {flash?.error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{flash.error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={submit}>
                <div>
                    <Label htmlFor="email">Email</Label>

                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="password">Password</Label>

                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <Label className="cursor-pointer font-normal">
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
                        <span className="text-ink-muted">
                            Remember me
                        </span>
                    </Label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="rounded-md text-sm text-ink-muted underline hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                        >
                            Forgot your password?
                        </Link>
                    )}
                </div>

                <Button className="mt-6 w-full justify-center" disabled={processing}>
                    Log in
                </Button>

                <p className="mt-4 text-center text-sm text-ink-muted">
                    No account yet?{' '}
                    <Link href={route('register')} className="font-bold">
                        Sign up
                    </Link>
                </p>
            </form>

            <div className="mt-6">
                <SocialLoginButtons />
            </div>
        </GuestLayout>
    );
}
