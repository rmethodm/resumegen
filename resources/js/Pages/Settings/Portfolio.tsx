import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    portfolioSlug: string | null;
    portfolioHeadline: string | null;
    portfolioBio: string | null;
    portfolioIsPublic: boolean;
    portfolioUrl: string | null;
}

export default function PortfolioSettings({ portfolioSlug, portfolioHeadline, portfolioBio, portfolioIsPublic, portfolioUrl }: Props) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        portfolio_slug: portfolioSlug ?? '',
        portfolio_headline: portfolioHeadline ?? '',
        portfolio_bio: portfolioBio ?? '',
        portfolio_is_public: portfolioIsPublic,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('portfolio.update'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Public Portfolio</h2>}>
            <Head title="Portfolio Settings" />
            <div className="py-12">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Public Portfolio</p>
                                <p className="text-sm text-gray-500">Make your portfolio visible to anyone with your link</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setData('portfolio_is_public', !data.portfolio_is_public)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.portfolio_is_public ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.portfolio_is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Portfolio URL</label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">resumegen.app/p/</span>
                                <input
                                    type="text"
                                    value={data.portfolio_slug}
                                    onChange={(e) => setData('portfolio_slug', e.target.value)}
                                    placeholder="your-name"
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {errors.portfolio_slug && <p className="mt-1 text-xs text-red-600">{errors.portfolio_slug}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Headline</label>
                            <input
                                type="text"
                                value={data.portfolio_headline}
                                onChange={(e) => setData('portfolio_headline', e.target.value)}
                                maxLength={150}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
                            <textarea
                                value={data.portfolio_bio}
                                onChange={(e) => setData('portfolio_bio', e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                Save
                            </button>
                            {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                            {portfolioUrl && data.portfolio_is_public && (
                                <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
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
