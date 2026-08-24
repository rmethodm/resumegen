import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';

interface Props {
    enabled: boolean;
    pending: boolean;
    qrCodeSvg: string | null;
    recoveryCodes: string[] | null;
    className?: string;
}

export default function TwoFactorForm({ enabled, pending, qrCodeSvg, recoveryCodes, className = '' }: Props) {
    const enableForm = useForm({});
    const confirmForm = useForm({ code: '' });
    const disableForm = useForm({});
    const regenForm = useForm({});
    const [copied, setCopied] = useState(false);

    const handleEnable: FormEventHandler = (e) => {
        e.preventDefault();
        enableForm.post(route('two-factor.enable'), { preserveScroll: true });
    };

    const handleConfirm: FormEventHandler = (e) => {
        e.preventDefault();
        confirmForm.post(route('two-factor.confirm'), { preserveScroll: true });
    };

    const handleDisable: FormEventHandler = (e) => {
        e.preventDefault();
        disableForm.delete(route('two-factor.disable'), { preserveScroll: true });
    };

    const handleRegen: FormEventHandler = (e) => {
        e.preventDefault();
        regenForm.post(route('two-factor.recovery-codes'), { preserveScroll: true });
    };

    const copyAll = () => {
        if (recoveryCodes) {
            navigator.clipboard
                .writeText(recoveryCodes.join('\n'))
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => undefined);
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h2>
                <p className="mt-1 text-sm text-ink-muted">
                    Add extra security to your account using a time-based one-time password.
                </p>
            </header>

            {/* State 1: Disabled */}
            {!enabled && !pending && (
                <form onSubmit={handleEnable} className="mt-6">
                    <Button disabled={enableForm.processing}>
                        Enable Two-Factor Authentication
                    </Button>
                </form>
            )}

            {/* State 2: Pending confirmation */}
            {pending && qrCodeSvg && (
                <div className="mt-6 space-y-4">
                    <p className="text-sm text-ink-muted">
                        Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
                    </p>
                    <div
                        className="inline-block rounded-sm border border-gray-200 p-2"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="confirm_code" value="Confirmation Code" />
                            <TextInput
                                id="confirm_code"
                                type="text"
                                inputMode="numeric"
                                value={confirmForm.data.code}
                                onChange={(e) => confirmForm.setData('code', e.target.value)}
                                className="mt-1 block w-40 tracking-widest text-center text-xl"
                                maxLength={6}
                                placeholder="000000"
                                autoComplete="one-time-code"
                            />
                            <InputError message={confirmForm.errors.code} className="mt-2" />
                        </div>
                        <Button disabled={confirmForm.processing}>Confirm</Button>
                    </form>
                </div>
            )}

            {/* State 3: Enabled */}
            {enabled && (
                <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-success-subtle px-3 py-0.5 text-sm font-medium text-success-text">
                            Enabled
                        </span>
                        <span className="text-sm text-ink-muted">Two-factor authentication is active.</span>
                    </div>

                    {recoveryCodes && recoveryCodes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Recovery Codes</p>
                            <p className="rounded-sm border border-warning/30 bg-warning-subtle p-2 text-sm text-amber-700">
                                Save these somewhere safe — they won't be shown again.
                            </p>
                            <pre className="rounded-sm bg-gray-100 p-4 text-sm font-mono leading-relaxed">
                                {recoveryCodes.join('\n')}
                            </pre>
                            <button
                                type="button"
                                onClick={copyAll}
                                className="text-sm text-brand underline hover:text-brand-accent"
                            >
                                {copied ? 'Copied!' : 'Copy all'}
                            </button>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <form onSubmit={handleRegen}>
                            <button
                                type="submit"
                                className="text-sm text-ink-muted underline hover:text-gray-900"
                                disabled={regenForm.processing}
                            >
                                Regenerate recovery codes
                            </button>
                        </form>

                        <form onSubmit={handleDisable}>
                            <button
                                type="submit"
                                className="text-sm text-danger underline hover:text-danger-text"
                                disabled={disableForm.processing}
                            >
                                Disable 2FA
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
