import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

interface ArticleFull {
    id: number;
    title: string;
    slug: string;
    category: string;
    is_published: boolean;
    published_at: string | null;
    updated_at: string;
    body: string;
    meta_description: string | null;
    reading_time_minutes: number;
}

interface Props {
    article: ArticleFull | null;
    categories: string[];
}

export default function AdminCareerEdit({ article, categories }: Props) {
    const form = useForm({
        title: article?.title ?? '',
        slug: article?.slug ?? '',
        body: article?.body ?? '',
        category: article?.category ?? (categories[0] ?? ''),
        meta_description: article?.meta_description ?? '',
        is_published: article?.is_published ?? false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (article) {
            form.put(route('admin.career.update', article.id));
        } else {
            form.post(route('admin.career.store'));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={article ? 'Edit Article' : 'New Article'} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h2 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">
                            {article ? 'Edit Article' : 'New Article'}
                        </h2>
                        <p className="mt-1 text-sm text-[#a0a0b0]">
                            {article ? `Editing: ${article.title}` : 'Create a new career hub article'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="overflow-hidden rounded-xl border border-[#eeeef5] bg-white shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                            <div className="divide-y divide-[#f5f5fb] px-6 py-5 space-y-5">

                                {/* Title */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.title}
                                        onChange={e => form.setData('title', e.target.value)}
                                        className="w-full rounded-lg border border-[#eeeef5] bg-[#fafafe] px-3 py-2 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                        placeholder="How to Write a Standout Resume"
                                    />
                                    {form.errors.title && (
                                        <p className="mt-1 text-xs text-red-600">{form.errors.title}</p>
                                    )}
                                </div>

                                {/* Slug */}
                                <div className="pt-5">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]">
                                        URL Slug
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.slug}
                                        onChange={e => form.setData('slug', e.target.value)}
                                        className="w-full rounded-lg border border-[#eeeef5] bg-[#fafafe] px-3 py-2 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                        placeholder="how-to-write-a-standout-resume"
                                    />
                                    {form.errors.slug && (
                                        <p className="mt-1 text-xs text-red-600">{form.errors.slug}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="pt-5">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]">
                                        Category
                                    </label>
                                    <select
                                        value={form.data.category}
                                        onChange={e => form.setData('category', e.target.value)}
                                        className="w-full rounded-lg border border-[#eeeef5] bg-[#fafafe] px-3 py-2 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    {form.errors.category && (
                                        <p className="mt-1 text-xs text-red-600">{form.errors.category}</p>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="pt-5">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]">
                                        Body <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={20}
                                        value={form.data.body}
                                        onChange={e => form.setData('body', e.target.value)}
                                        className="w-full rounded-lg border border-[#eeeef5] bg-[#fafafe] px-3 py-2 font-mono text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                        placeholder="Article content..."
                                    />
                                    {form.errors.body && (
                                        <p className="mt-1 text-xs text-red-600">{form.errors.body}</p>
                                    )}
                                </div>

                                {/* Meta description */}
                                <div className="pt-5">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#a0a0b0]">
                                        Meta Description
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.meta_description}
                                        onChange={e => form.setData('meta_description', e.target.value)}
                                        className="w-full rounded-lg border border-[#eeeef5] bg-[#fafafe] px-3 py-2 text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                                        placeholder="Brief description for search engines (150–160 chars)"
                                        maxLength={160}
                                    />
                                    {form.errors.meta_description && (
                                        <p className="mt-1 text-xs text-red-600">{form.errors.meta_description}</p>
                                    )}
                                </div>

                                {/* Published toggle */}
                                <div className="flex items-center gap-3 pt-5">
                                    <input
                                        id="is_published"
                                        type="checkbox"
                                        checked={form.data.is_published}
                                        onChange={e => form.setData('is_published', e.target.checked)}
                                        className="h-4 w-4 rounded border-[#eeeef5] text-[#4f46e5] focus:ring-[#4f46e5]"
                                    />
                                    <label htmlFor="is_published" className="text-sm font-semibold text-[#0f0f1a]">
                                        Published
                                    </label>
                                    {form.errors.is_published && (
                                        <p className="text-xs text-red-600">{form.errors.is_published}</p>
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <Link
                                href={route('admin.career.index')}
                                className="rounded-lg border border-[#eeeef5] px-4 py-2 text-sm text-[#71717a] transition hover:bg-[#fafafe]"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                            >
                                {form.processing ? 'Saving…' : 'Save'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
