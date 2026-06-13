import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type Owner = { id: number; name: string | null; email: string | null } | null;
type Row = Record<string, unknown> & { id: number; owner?: Owner };
type Paginated = { data: Row[]; links: { url: string | null; label: string; active: boolean }[] };
type Props = {
    type: string;
    items: Paginated;
    counts: Record<string, number>;
    filters: { q?: string };
};

const TABS = [
    { key: 'resumes', label: 'Resumes' },
    { key: 'cover-letters', label: 'Cover Letters' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'portfolios', label: 'Portfolios' },
];

function ownerCell(owner: Owner) {
    if (!owner) return <span className="text-gray-400">—</span>;
    return (
        <div>
            <div>{owner.name ?? '—'}</div>
            <div className="text-gray-400">{owner.email}</div>
        </div>
    );
}

export default function ContentIndex({ type, items, counts, filters }: Props) {
    const [q, setQ] = useState(filters.q ?? '');

    const go = (params: Record<string, string>) =>
        router.get(route('admin.content.index'), { type, q, ...params }, { preserveState: true, replace: true });

    const del = (routeName: string, id: number, label: string) => {
        if (confirm(`Delete this ${label}? This cannot be undone.`)) {
            router.delete(route(routeName, id), { preserveScroll: true });
        }
    };

    const patch = (routeName: string, id: number, msg: string) => {
        if (confirm(msg)) router.patch(route(routeName, id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Content" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="mb-4 text-xl font-semibold">Content</h1>

                <div className="mb-4 flex flex-wrap gap-1">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => router.get(route('admin.content.index'), { type: t.key })}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                type === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {t.label} <span className="opacity-60">{counts[t.key] ?? 0}</span>
                        </button>
                    ))}
                </div>

                <div className="mb-4 flex gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && go({})}
                        placeholder="Search by name or owner email…"
                        className="w-full max-w-md rounded-lg border-gray-200 text-sm"
                    />
                    <button onClick={() => go({})} className="rounded-lg bg-gray-100 px-3 text-sm">Search</button>
                </div>

                <table className="w-full text-sm">
                    <tbody>
                        {items.data.map((row) => (
                            <tr key={row.id} className="border-t border-gray-100 align-top">
                                {type === 'resumes' && (
                                    <>
                                        <td className="py-2">
                                            <div className="font-medium">{String(row.name ?? '—')}</div>
                                            <div className="text-gray-400">{String(row.template ?? '')}{row.is_master ? ' · master' : ''}</div>
                                        </td>
                                        <td>{ownerCell(row.owner ?? null)}</td>
                                        <td className="text-gray-500">{Number(row.share_links_count ?? 0)} shares</td>
                                        <td className="text-right">
                                            <Link href={route('admin.content.resume.show', row.id)} className="mr-3 text-indigo-600">View</Link>
                                            <button onClick={() => del('admin.content.resume.destroy', row.id, 'resume')} className="text-red-600">Delete</button>
                                        </td>
                                    </>
                                )}
                                {type === 'cover-letters' && (
                                    <>
                                        <td className="py-2">
                                            <div className="font-medium">{String(row.name ?? '—')}</div>
                                            <div className="text-gray-400">{String(row.template_key ?? '')}</div>
                                        </td>
                                        <td>{ownerCell(row.owner ?? null)}</td>
                                        <td className="text-right">
                                            <button onClick={() => del('admin.content.cover-letter.destroy', row.id, 'cover letter')} className="text-red-600">Delete</button>
                                        </td>
                                    </>
                                )}
                                {type === 'jobs' && (
                                    <>
                                        <td className="py-2">
                                            <div className="font-medium">{String(row.company ?? '—')}</div>
                                            <div className="text-gray-400">{String(row.role ?? '')} · {String(row.status ?? '')}</div>
                                        </td>
                                        <td>{ownerCell(row.owner ?? null)}</td>
                                        <td className="text-right">
                                            <button onClick={() => del('admin.content.job.destroy', row.id, 'job application')} className="text-red-600">Delete</button>
                                        </td>
                                    </>
                                )}
                                {type === 'portfolios' && (
                                    <>
                                        <td className="py-2">
                                            <a href={`/p/${row.portfolio_slug}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-600">/p/{String(row.portfolio_slug)}</a>
                                            <div className="text-gray-400">{row.portfolio_is_public ? 'public' : 'private'}</div>
                                        </td>
                                        <td>{ownerCell({ id: row.id, name: String(row.name ?? ''), email: String(row.email ?? '') })}</td>
                                        <td className="text-right">
                                            {row.portfolio_is_public ? (
                                                <button onClick={() => patch('admin.content.portfolio.unpublish', row.id, 'Unpublish this portfolio?')} className="text-red-600">Unpublish</button>
                                            ) : (
                                                <span className="text-gray-300">private</span>
                                            )}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {items.data.length === 0 && <p className="mt-4 text-gray-400">Nothing here.</p>}

                <div className="mt-4 flex flex-wrap gap-1">
                    {items.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            className={`rounded px-3 py-1 text-sm ${
                                link.active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                            } ${!link.url ? 'pointer-events-none text-gray-300' : ''}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
