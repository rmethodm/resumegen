import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

interface Article {
    id: number;
    title: string;
    slug: string;
    category: string;
    is_published: boolean;
    published_at: string | null;
    updated_at: string;
}

interface Props {
    articles: Article[];
}

export default function AdminCareerIndex({ articles }: Props) {
    const handleDelete = (article: Article) => {
        if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
        router.delete(route('admin.career.destroy', article.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Career Articles" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Career Articles</h2>
                            <p className="mt-1 text-sm text-[#a0a0b0]">Manage career hub articles</p>
                        </div>
                        <Link
                            href={route('admin.career.create')}
                            className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            New Article
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eeeef5] bg-[#fafafe] text-left">
                                    {['Title', 'Category', 'Status', 'Published', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5fb]">
                                {articles.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#a0a0b0]">No articles yet.</td>
                                    </tr>
                                ) : articles.map(article => (
                                    <tr key={article.id} className="transition-colors hover:bg-[#fafafe]">
                                        <td className="px-5 py-3 font-semibold text-[#0f0f1a]">{article.title}</td>
                                        <td className="px-5 py-3 capitalize text-[#71717a]">{article.category}</td>
                                        <td className="px-5 py-3">
                                            {article.is_published ? (
                                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">Published</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-[#f5f5fb] px-2.5 py-0.5 text-[10px] font-bold text-[#71717a]">Draft</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#a0a0b0]">
                                            {article.published_at ? new Date(article.published_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                <Link
                                                    href={route('admin.career.edit', article.id)}
                                                    className="rounded-lg bg-[#f5f5fb] px-3 py-1 text-xs font-semibold text-[#4f46e5] transition hover:bg-[#eeeef5]"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(article)}
                                                    className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
