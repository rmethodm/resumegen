import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';

interface Props {
    enabled: boolean;
    pending: boolean;
    qrCodeSvg: string | null;
    recoveryCodes: string[] | null;
    className?: string;
}

export default function TwoFactorForm({
    enabled,
    pending,
    qrCodeSvg,
    recoveryCodes,
    className = '',
}: Props) {
    const enableForm = useForm({});
    const confirmForm = useForm({ code: '' });
    const disableForm = useForm({});
    const regenForm = useForm({});
    const [copied, setCopied] = useState(false);

    const handleEnableToggle = (checked: boolean) => {
        if (checked) {
            enableForm.post(route('two-factor.enable'), { preserveScroll: true });
        }
    };

    const handleConfirm: FormEventHandler = (e) => {
        e.preventDefault();
        confirmForm.post(route('two-factor.confirm'), { preserveScroll: true });
    };

    const handleDisableToggle = (checked: boolean) => {
        if (!checked) {
            disableForm.delete(route('two-factor.disable'), { preserveScroll: true });
        }
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
                <h2 className="text-lg font-medium text-ink">Two-Factor Authentication</h2>
                <p className="mt-1 text-sm text-ink-muted">
                    Add extra security to your account using a time-based one-time password.
                </p>
            </header>

            {/* State 1: Disabled */}
            {!enabled && !pending && (
                <div className="mt-6 flex items-center gap-3">
                    <Switch
                        id="two-factor-toggle"
                        checked={false}
                        disabled={enableForm.processing}
                        onCheckedChange={handleEnableToggle}
                    />
                    <Label htmlFor="two-factor-toggle">
                        Enable Two-Factor Authentication
                    </Label>
                </div>
            )}

            {/* State 2: Pending confirmation */}
            {pending && qrCodeSvg && (
                <div className="mt-6 space-y-4">
                    <p className="text-sm text-ink-muted">
                        Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
                    </p>
                    <div
                        className="inline-block rounded-sm border border-surface-border p-2"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="confirm_code">Confirmation Code</Label>
                            <Input
                                id="confirm_code"
                                type="text"
                                inputMode="numeric"
                                value={confirmForm.data.code}
                                onChange={(e) => confirmForm.setData('code', e.target.value)}
                                className="w-40 tracking-widest text-center text-xl"
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
                    <div className="flex items-center gap-3">
                        <Switch
                            id="two-factor-toggle-enabled"
                            checked={true}
                            disabled={disableForm.processing}
                            onCheckedChange={handleDisableToggle}
                        />
                        <Label htmlFor="two-factor-toggle-enabled">
                            Two-factor authentication is enabled
                        </Label>
                    </div>

                    {recoveryCodes && recoveryCodes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-ink-muted">Recovery Codes</p>
                            <p className="rounded-sm border border-warning/30 bg-warning-subtle p-2 text-sm text-amber-700">
                                Save these somewhere safe — they won't be shown again.
                            </p>
                            <pre className="rounded-sm bg-surface p-4 text-sm font-mono leading-relaxed">
                                {recoveryCodes.join('\n')}
                            </pre>
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-sm text-brand hover:text-brand-accent"
                                onClick={copyAll}
                            >
                                {copied ? 'Copied!' : 'Copy all'}
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4">
                        <form onSubmit={handleRegen}>
                            <Button
                                type="submit"
                                variant="link"
                                className="h-auto p-0 text-sm text-ink-muted hover:text-ink"
                                disabled={regenForm.processing}
                            >
                                Regenerate recovery codes
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
