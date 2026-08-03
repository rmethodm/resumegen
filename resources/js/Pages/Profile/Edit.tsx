import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import TwoFactorForm from './Partials/TwoFactorForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

function PersonaForm({
    profile,
    persona,
    allowedTemplates,
}: {
    profile: Record<string, string | undefined>;
    persona: {
        target_role: string | null;
        industry: string | null;
        years_experience: number | null;
        preferred_template: string | null;
    };
    allowedTemplates: string[];
}) {
    const [data, setData] = React.useState({
        full_name: profile.full_name ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        website: profile.website ?? '',
        target_role: persona.target_role ?? '',
        industry: persona.industry ?? '',
        years_experience: persona.years_experience?.toString() ?? '',
        preferred_template: persona.preferred_template ?? '',
    });

    const save = () => {
        router.patch(route('profile.persona'), data, { preserveScroll: true });
    };

    const field = (label: string, key: keyof typeof data, type = 'text') => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand sm:text-sm"
                value={data[key]}
                onChange={e => setData(prev => ({ ...prev, [key]: e.target.value }))}
                onBlur={save}
            />
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('Full Name', 'full_name')}
            {field('Email', 'email', 'email')}
            {field('Phone', 'phone', 'tel')}
            {field('Location', 'location')}
            {field('LinkedIn URL', 'linkedin_url', 'url')}
            {field('Website', 'website', 'url')}
            {field('Target Role', 'target_role')}
            {field('Industry', 'industry')}
            {field('Years of Experience', 'years_experience', 'number')}
            <div>
                <label className="block text-sm font-medium text-gray-700">Preferred Template</label>
                <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand sm:text-sm"
                    value={data.preferred_template}
                    onChange={e => {
                        setData(prev => ({ ...prev, preferred_template: e.target.value }));
                        setTimeout(save, 0);
                    }}
                >
                    <option value="">No preference</option>
                    {allowedTemplates.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default function Edit({
    mustVerifyEmail,
    status,
    twoFactor,
    profile,
    persona,
    allowedTemplates,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    twoFactor: {
        enabled: boolean;
        pending: boolean;
        qrCodeSvg: string | null;
        recoveryCodes: string[] | null;
    };
    profile: Record<string, string> | null;
    persona: {
        target_role: string | null;
        industry: string | null;
        years_experience: number | null;
        preferred_template: string | null;
    };
    allowedTemplates: string[];
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
                        <section className="space-y-6">
                            <header>
                                <h2 className="text-lg font-medium text-gray-900">Starter Profile</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Pre-fills the contact section and defaults on every new resume you create.
                                </p>
                            </header>

                            <PersonaForm profile={profile ?? {}} persona={persona} allowedTemplates={allowedTemplates} />
                        </section>
                    </div>

                    <div className="rounded-xl border border-red-100 bg-white p-6 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
