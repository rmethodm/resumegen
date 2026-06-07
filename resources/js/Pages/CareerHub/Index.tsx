import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    category: string;
    reading_time_minutes: number;
    published_at: string | null;
}

interface Props {
    articles: Article[];
    categories: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
    'Resume Tips': 'text-indigo-600',
    'Job Search': 'text-emerald-600',
    'Interviews': 'text-amber-600',
    'Salary & Negotiation': 'text-rose-600',
    'Career Growth': 'text-violet-600',
};

export default function Index({ articles, categories }: Props) {
    const [activeCategory, setActiveCategory] = useState<string>('All');

    const filtered = activeCategory === 'All'
        ? articles
        : articles.filter(a => a.category === activeCategory);

    return (
        <PublicLayout>
            <Head title="Career Resources — Resumegen" />

            <div className="min-h-screen bg-gray-50 py-12">
                <div className="mx-auto max-w-5xl px-4">

                    {/* Page header */}
                    <div className="mb-10 text-center">
                        <h1 className="text-4xl font-black tracking-tight text-gray-900">
                            Career Resources
                        </h1>
                        <p className="mt-3 text-base text-gray-500">
                            Guides, tips, and advice to land your next role
                        </p>
                    </div>

                    {/* Category filter pills */}
                    <div className="mb-8 flex flex-wrap gap-2 justify-center">
                        <button
                            onClick={() => setActiveCategory('All')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                activeCategory === 'All'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            All
                        </button>
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                    activeCategory === category
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Article grid */}
                    {filtered.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-16">
                            No articles in this category yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {filtered.map(article => (
                                <Link
                                    key={article.id}
                                    href={route('career.show', article.slug)}
                                    className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
                                >
                                    <span className={`text-xs font-bold uppercase tracking-wider ${CATEGORY_COLORS[article.category] ?? 'text-gray-500'}`}>
                                        {article.category}
                                    </span>
                                    <h2 className="mt-2 text-base font-bold text-gray-900 group-hover:text-indigo-600 transition">
                                        {article.title}
                                    </h2>
                                    <p className="mt-3 text-xs text-gray-400">
                                        {article.reading_time_minutes} min read
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </PublicLayout>
    );
}
