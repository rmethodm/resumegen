import PublicLayout from '@/Layouts/PublicLayout';
import { type PageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEvent } from 'react';

interface SocialLink {
    platform: 'linkedin' | 'github' | 'x' | 'website';
    url: string;
}

interface ResumeEntry {
    id: number;
    name: string;
    template: string;
    share_url: string | null;
}

interface Owner {
    name: string;
    slug: string;
    headline: string | null;
    bio: string | null;
    links: SocialLink[];
}

interface Props {
    owner: Owner;
    resumes: ResumeEntry[];
    contactSent: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    x: 'X',
    website: 'Website',
};

const PLATFORM_ICONS: Record<string, string> = {
    linkedin: 'in',
    github: 'gh',
    x: 'x',
    website: '🌐',
};

function InitialsAvatar({ name }: { name: string }) {
    const parts = name.split(' ');
    const initials = (parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : (parts[0] ?? '').slice(0, 2)
    ).toUpperCase();
    const palette = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500'];
    const color = palette[name.charCodeAt(0) % palette.length];

    return (
        <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ${color}`}>
            {initials}
        </div>
    );
}

export default function PortfolioShow({ owner, resumes, contactSent }: Props) {
    const { auth } = usePage<PageProps>().props;

    const { data, setData, post, processing, errors } = useForm({
        sender_name: '',
        sender_email: '',
        message: '',
    });

    const submitContact = (e: FormEvent) => {
        e.preventDefault();
        post(route('portfolio.contact', owner.slug));
    };

    return (
        <PublicLayout>
            <Head title={`${owner.name}'s Portfolio`} />

            {/* Guest CTA */}
            {!auth?.user && (
                <div className="fixed right-4 top-4 z-50">
                    <a
                        href={route('register')}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                    >
                        Build yours free →
                    </a>
                </div>
            )}

            <div className="mx-auto max-w-2xl space-y-12 px-4 py-16">

                {/* Hero */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <InitialsAvatar name={owner.name} />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{owner.name}</h1>
                        {owner.headline && (
                            <p className="mt-1 text-lg text-gray-600">{owner.headline}</p>
                        )}
                        {owner.bio && (
                            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">{owner.bio}</p>
                        )}
                    </div>
                    {owner.links.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {owner.links.map((link) => (
                                <a
                                    key={link.platform}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                                >
                                    <span className="font-bold">{PLATFORM_ICONS[link.platform]}</span>
                                    {PLATFORM_LABELS[link.platform]}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resume grid */}
                {resumes.length > 0 && (
                    <div>
                        <h2 className="mb-4 text-lg font-semibold text-gray-800">Resumes</h2>
                        <div className="space-y-3">
                            {resumes.map((resume) => (
                                <div
                                    key={resume.id}
                                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{resume.name}</p>
                                        <p className="mt-0.5 text-xs capitalize text-gray-400">
                                            {resume.template} template
                                        </p>
                                    </div>
                                    {resume.share_url && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={resume.share_url}
                                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                View
                                            </a>
                                            <a
                                                href={`${resume.share_url}/pdf`}
                                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                                            >
                                                Download PDF
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contact form */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-800">Get in touch</h2>

                    {contactSent ? (
                        <p className="text-sm font-medium text-green-600">
                            Message sent! {owner.name.split(' ')[0]} will be in touch.
                        </p>
                    ) : (
                        <form onSubmit={submitContact} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Your name
                                    </label>
                                    <input
                                        type="text"
                                        value={data.sender_name}
                                        onChange={(e) => setData('sender_name', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                    {errors.sender_name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.sender_name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Your email
                                    </label>
                                    <input
                                        type="email"
                                        value={data.sender_email}
                                        onChange={(e) => setData('sender_email', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                    {errors.sender_email && (
                                        <p className="mt-1 text-xs text-red-600">{errors.sender_email}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Message
                                </label>
                                <textarea
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                                {errors.message && (
                                    <p className="mt-1 text-xs text-red-600">{errors.message}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Send message
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </PublicLayout>
    );
}
