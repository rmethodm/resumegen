import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import BrowserExtensionTokens from './Partials/BrowserExtensionTokens';
import DeleteUserForm from './Partials/DeleteUserForm';
import TwoFactorForm from './Partials/TwoFactorForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
    tokens,
    twoFactor,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    tokens: { id: number; name: string; created_at: string }[];
    twoFactor: {
        enabled: boolean;
        pending: boolean;
        qrCodeSvg: string | null;
        recoveryCodes: string[] | null;
    };
}>) {
    return (
        <AuthenticatedLayout>
            <Head title="Profile" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">

                    <div className="mb-2">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Profile</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your account settings</p>
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} className="max-w-xl" />
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <TwoFactorForm
                            enabled={twoFactor.enabled}
                            pending={twoFactor.pending}
                            qrCodeSvg={twoFactor.qrCodeSvg}
                            recoveryCodes={twoFactor.recoveryCodes}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-xl border border-[#eeeef5] bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <BrowserExtensionTokens tokens={tokens} className="max-w-xl" />
                    </div>

                    <div className="rounded-xl border border-red-100 bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
