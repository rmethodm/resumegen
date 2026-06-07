import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

interface ArticleFull {
    id: number;
    title: string;
    slug: string;
    category: string;
    reading_time_minutes: number;
    published_at: string | null;
    body: string;
    meta_description: string | null;
}

interface Props {
    article: ArticleFull;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Resume Tips': 'text-indigo-600',
    'Job Search': 'text-emerald-600',
    'Interviews': 'text-amber-600',
    'Salary & Negotiation': 'text-rose-600',
    'Career Growth': 'text-violet-600',
};

export default function Show({ article }: Props) {
    return (
        <PublicLayout>
            <Head title={`${article.title} — Resumegen`}>
                <meta name="description" content={article.meta_description ?? ''} />
            </Head>

            <div className="min-h-screen bg-gray-50 py-12">
                <div className="mx-auto max-w-3xl px-4">

                    {/* Breadcrumb */}
                    <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500">
                        <Link href={route('career.index')} className="hover:text-indigo-600 transition">
                            ← Career Hub
                        </Link>
                        <span>/</span>
                        <span className="text-gray-700 truncate">{article.title}</span>
                    </nav>

                    {/* Article */}
                    <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                        <span className={`text-xs font-bold uppercase tracking-wider ${CATEGORY_COLORS[article.category] ?? 'text-gray-500'}`}>
                            {article.category}
                        </span>
                        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
                            {article.title}
                        </h1>
                        <p className="mt-2 text-sm text-gray-400">
                            {article.reading_time_minutes} min read
                        </p>

                        <div
                            dangerouslySetInnerHTML={{ __html: article.body }}
                            className="prose prose-lg max-w-none mt-6"
                        />
                    </article>

                    {/* CTA footer */}
                    <div className="mt-10 rounded-xl bg-indigo-600 px-8 py-6 text-center shadow-md">
                        <Link
                            href={route('register')}
                            className="text-base font-bold text-white hover:text-indigo-100 transition"
                        >
                            Build your free resume with Resumegen →
                        </Link>
                    </div>

                </div>
            </div>
        </PublicLayout>
    );
}
