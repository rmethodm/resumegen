import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { SocialLoginButtons } from '@/Components/auth/SocialLoginButtons';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <h1 className="mb-1 text-center text-xl font-bold text-ink">
                Create your account
            </h1>
            <p className="mb-6 text-center text-sm text-ink-muted">
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

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <label className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
                    <Checkbox className="mt-0.5" required />
                    <span>
                        I agree to the{' '}
                        <Link
                            href={route('legal.terms')}
                            className="focus-ring rounded-sm font-semibold text-brand hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                            href={route('legal.privacy')}
                            className="focus-ring rounded-sm font-semibold text-brand hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Privacy Policy
                        </Link>
                    </span>
                </label>

                <Button className="mt-4 w-full justify-center" disabled={processing}>
                    Create account
                </Button>

                <p className="mt-4 text-center text-sm text-ink-muted">
                    Already have an account?{' '}
                    <Link href={route('login')} className="font-bold">
                        Log in
                    </Link>
                </p>
            </form>

            <div className="mt-6">
                <SocialLoginButtons />
            </div>
        </GuestLayout>
    );
}
