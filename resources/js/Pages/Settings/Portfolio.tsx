import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler, useCallback, useEffect, useState } from 'react';

interface SocialLink {
    platform: 'linkedin' | 'github' | 'x' | 'website';
    url: string;
}

interface Props {
    portfolioSlug: string | null;
    portfolioHeadline: string | null;
    portfolioBio: string | null;
    portfolioIsPublic: boolean;
    portfolioLinks: SocialLink[];
    portfolioUrl: string | null;
}

const PLATFORMS: { key: SocialLink['platform']; label: string; placeholder: string }[] = [
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/your-name' },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/your-name' },
    { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/your-handle' },
    { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
];

export default function PortfolioSettings({
    portfolioSlug,
    portfolioHeadline,
    portfolioBio,
    portfolioIsPublic,
    portfolioLinks,
    portfolioUrl,
}: Props) {
    const linksMap = Object.fromEntries(portfolioLinks.map((l) => [l.platform, l.url]));

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        portfolio_slug: portfolioSlug ?? '',
        portfolio_headline: portfolioHeadline ?? '',
        portfolio_bio: portfolioBio ?? '',
        portfolio_is_public: portfolioIsPublic,
        portfolio_links: portfolioLinks,
        _link_linkedin: linksMap['linkedin'] ?? '',
        _link_github: linksMap['github'] ?? '',
        _link_x: linksMap['x'] ?? '',
        _link_website: linksMap['website'] ?? '',
    });

    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);

    const checkSlug = useCallback(
        async (slug: string) => {
            if (!slug || slug === portfolioSlug || slug.length < 3) {
                setSlugAvailable(null);
                return;
            }
            setCheckingSlug(true);
            try {
                const res = await fetch(route('portfolio.check-slug') + '?slug=' + encodeURIComponent(slug));
                const json = await res.json() as { available: boolean };
                setSlugAvailable(json.available);
            } finally {
                setCheckingSlug(false);
            }
        },
        [portfolioSlug],
    );

    useEffect(() => {
        const id = setTimeout(() => checkSlug(data.portfolio_slug), 400);
        return () => clearTimeout(id);
    }, [data.portfolio_slug, checkSlug]);

    const buildLinks = (field: string, value: string): SocialLink[] => {
        const updated: Record<string, string> = {
            _link_linkedin: data._link_linkedin,
            _link_github: data._link_github,
            _link_x: data._link_x,
            _link_website: data._link_website,
            [field]: value,
        };
        return PLATFORMS.filter((p) => updated[`_link_${p.key}`])
            .map((p) => ({
                platform: p.key,
                url: updated[`_link_${p.key}`],
            }));
    };

    const handleLinkChange = (field: string, value: string) => {
        setData((prev) => ({
            ...prev,
            [field]: value,
            portfolio_links: buildLinks(field, value),
        }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('portfolio.update'));
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Public Portfolio</h2>}
        >
            <Head title="Portfolio Settings" />
            <div className="py-12">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">

                        {/* Public toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Public Portfolio</p>
                                <p className="text-sm text-gray-500">
                                    Make your portfolio visible to anyone with your link
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setData('portfolio_is_public', !data.portfolio_is_public)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.portfolio_is_public ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.portfolio_is_public ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Portfolio URL
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">resumegen.app/p/</span>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={data.portfolio_slug}
                                        onChange={(e) => setData('portfolio_slug', e.target.value.toLowerCase())}
                                        placeholder="your-name"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {!checkingSlug && slugAvailable === true && (
                                        <span className="absolute right-2.5 top-2.5 text-xs text-green-500">✓</span>
                                    )}
                                    {!checkingSlug && slugAvailable === false && (
                                        <span className="absolute right-2.5 top-2.5 text-xs text-red-500">✗</span>
                                    )}
                                    {checkingSlug && (
                                        <span className="absolute right-2.5 top-2.5 text-xs text-gray-400">…</span>
                                    )}
                                </div>
                            </div>
                            {errors.portfolio_slug && (
                                <p className="mt-1 text-xs text-red-600">{errors.portfolio_slug}</p>
                            )}
                            {!checkingSlug && slugAvailable === false && !errors.portfolio_slug && (
                                <p className="mt-1 text-xs text-red-500">That slug is already taken.</p>
                            )}
                        </div>

                        {/* Headline */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Headline</label>
                            <input
                                type="text"
                                value={data.portfolio_headline}
                                onChange={(e) => setData('portfolio_headline', e.target.value)}
                                maxLength={150}
                                placeholder="Senior Software Engineer"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
                            <textarea
                                value={data.portfolio_bio}
                                onChange={(e) => setData('portfolio_bio', e.target.value)}
                                rows={3}
                                maxLength={2000}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Social links */}
                        <div>
                            <p className="mb-3 text-sm font-medium text-gray-700">Social links</p>
                            <div className="space-y-2">
                                {PLATFORMS.map((p) => (
                                    <div key={p.key} className="flex items-center gap-2">
                                        <span className="w-20 text-right text-xs text-gray-500">{p.label}</span>
                                        <input
                                            type="url"
                                            value={(data as unknown as Record<string, string>)[`_link_${p.key}`] ?? ''}
                                            onChange={(e) =>
                                                handleLinkChange(`_link_${p.key}`, e.target.value)
                                            }
                                            placeholder={p.placeholder}
                                            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Save
                            </button>
                            {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                            {portfolioUrl && data.portfolio_is_public && (
                                <a
                                    href={portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Preview portfolio →
                                </a>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
