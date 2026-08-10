import { Head, Link, router, useHttp } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';

// ponytail: resume matching, gap analysis, tailoring, and cover letters are
// all removed features (see CLAUDE.md "Removed Features") — those actions
// stay toast stubs below. Only search (Adzuna/USAJOBS) + persistence are real.

type Source = 'adzuna' | 'usajobs';
type Status = 'New' | 'Saved' | 'Tailoring' | 'Applied' | 'Archived';

type ImportedJob = {
    id: number;
    source: Source;
    title: string;
    company: string | null;
    location: string | null;
    url: string | null;
    salary: string | null;
    description: string | null;
    posted_at: string | null;
    status: Status;
};

type SearchResult = {
    source: Source;
    external_id: string;
    title: string;
    company: string | null;
    location: string | null;
    url: string | null;
    salary: string | null;
    description: string | null;
    posted_at: string | null;
};

const SOURCE_META: Record<Source, { badge: string; label: string }> = {
    adzuna: { badge: 'bg-blue-100 text-blue-700', label: 'Adzuna' },
    usajobs: { badge: 'bg-purple-100 text-purple-700', label: 'USAJOBS' },
};

const STATUS_META: Record<Status, string> = {
    New: 'bg-success-subtle text-success-text',
    Saved: 'bg-gray-100 text-gray-500',
    Tailoring: 'bg-brand-subtle text-brand-accent',
    Applied: 'bg-success-subtle text-success-text',
    Archived: 'bg-gray-100 text-gray-400',
};

function resultKey(job: SearchResult): string {
    return `${job.source}:${job.external_id}`;
}

export default function JobImportsPage({
    jobs,
    sourcesAvailable,
}: {
    jobs: ImportedJob[];
    sourcesAvailable: Source[];
}) {
    const [filter, setFilter] = useState<'all' | Source>('all');
    const [openJobId, setOpenJobId] = useState<number | null>(jobs[0]?.id ?? null);
    const [toast, setToast] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    const { data, setData, post, processing, errors } = useHttp<
        { keyword: string; location: string },
        { results: SearchResult[]; sourcesAvailable: Source[] }
    >({ keyword: '', location: '' });

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 2200);
    };
    const stub = (message: string) => () => showToast(`Preview only — ${message} is not implemented.`);

    const runSearch = (e: React.FormEvent) => {
        e.preventDefault();
        post('/jobs-imports/search', {
            onSuccess: (response) => {
                setSearchResults(response.results ?? []);
                setSelectedResults(new Set());
            },
        });
    };

    const toggleResult = (job: SearchResult) => {
        const key = resultKey(job);
        setSelectedResults((keys) => {
            const next = new Set(keys);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const importSelected = () => {
        const toImport = searchResults.filter((job) => selectedResults.has(resultKey(job)));
        if (toImport.length === 0) return;

        setImporting(true);
        router.post(
            '/jobs-imports',
            { jobs: toImport },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showToast(`Imported ${toImport.length} job${toImport.length === 1 ? '' : 's'}`);
                    setSearchResults((results) => results.filter((job) => !selectedResults.has(resultKey(job))));
                    setSelectedResults(new Set());
                },
                onFinish: () => setImporting(false),
            },
        );
    };

    const setStatus = (job: ImportedJob, status: Status) => {
        router.patch(
            `/jobs-imports/${job.id}`,
            { status },
            { preserveScroll: true, onSuccess: () => showToast(`Marked "${job.title}" as ${status}`) },
        );
    };

    const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.source === filter);
    const selectedJob = openJobId ? (jobs.find((j) => j.id === openJobId) ?? null) : null;

    const tabs: { key: 'all' | Source; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: jobs.length },
        { key: 'adzuna', label: 'Adzuna', count: jobs.filter((j) => j.source === 'adzuna').length },
        { key: 'usajobs', label: 'USAJOBS', count: jobs.filter((j) => j.source === 'usajobs').length },
    ];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Job Imports</h2>}>
            <Head title="Job Imports" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {sourcesAvailable.length === 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-amber-800">
                        No search sources configured. Add <code>ADZUNA_APP_ID</code>/<code>ADZUNA_APP_KEY</code> or{' '}
                        <code>USAJOBS_KEY</code>/<code>USAJOBS_EMAIL</code> to your <code>.env</code> to enable search.
                    </div>
                )}

                <div className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-amber-800">
                    <strong>Search and import are real.</strong> Resume matching, gap analysis, tailoring,
                    and cover-letter drafting below are still stubs.
                </div>

                <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                        <h1 className="text-base font-bold text-ink">Imported jobs</h1>
                        <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[11px] font-bold text-brand-accent">
                            {jobs.length} jobs
                        </span>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={() => setSearchOpen((v) => !v)}>
                                {searchOpen ? 'Close search' : 'Search jobs'}
                            </Button>
                            <Link href={route('profile.edit')}>
                                <Button type="button">Get browser extension</Button>
                            </Link>
                        </div>
                    </div>

                    {searchOpen && (
                        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <form onSubmit={runSearch} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Keyword</label>
                                    <input
                                        type="text"
                                        value={data.keyword}
                                        onChange={(e) => setData('keyword', e.target.value)}
                                        placeholder="e.g. Product Designer"
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                                    />
                                    {errors.keyword && <div className="mt-1 text-xs text-danger">{errors.keyword}</div>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Location</label>
                                    <input
                                        type="text"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder="e.g. Remote"
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Searching…' : 'Search'}
                                </Button>
                                {selectedResults.size > 0 && (
                                    <Button variant="outline" type="button" onClick={importSelected} disabled={importing}>
                                        {importing ? 'Importing…' : `Import ${selectedResults.size} selected`}
                                    </Button>
                                )}
                            </form>

                            {searchResults.length > 0 && (
                                <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                                    {searchResults.map((job) => {
                                        const key = resultKey(job);
                                        const checked = selectedResults.has(key);
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => toggleResult(job)}
                                                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0 hover:bg-gray-50"
                                            >
                                                <span className={checked ? 'text-brand' : 'text-gray-300'}>
                                                    {checked ? '☑' : '☐'}
                                                </span>
                                                <span className={`w-fit rounded px-1.5 py-1 text-[9.5px] font-bold ${SOURCE_META[job.source].badge}`}>
                                                    {SOURCE_META[job.source].label}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-bold text-ink">{job.title}</div>
                                                    <div className="truncate text-xs font-medium text-gray-500">
                                                        {job.company ?? 'Unknown company'} · {job.location ?? 'Unknown location'}
                                                    </div>
                                                </div>
                                                {job.salary && (
                                                    <span className="text-xs font-semibold text-gray-500">{job.salary}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {processing === false && searchResults.length === 0 && data.keyword !== '' && (
                                <div className="mt-3 text-xs text-gray-400">
                                    No results yet — try a search, or check that a source is configured above.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 border-b border-gray-100 px-6 pt-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`border-b-2 pb-2.5 text-xs font-semibold ${
                                    filter === tab.key ? 'border-brand text-brand-accent' : 'border-transparent text-gray-400'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-0" style={{ height: 480 }}>
                        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-gray-100">
                            {filtered.length === 0 && (
                                <div className="px-6 py-10 text-center text-xs font-medium text-gray-400">
                                    No imported jobs from this source yet. Use "Search jobs" above to find some.
                                </div>
                            )}
                            {filtered.map((job) => (
                                <div
                                    key={job.id}
                                    onClick={() => setOpenJobId(job.id)}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-5 py-3 hover:bg-gray-50 ${
                                        job.id === openJobId ? 'bg-brand-subtle/40' : ''
                                    }`}
                                >
                                    <span className={`w-fit rounded px-1.5 py-1 text-[9.5px] font-bold ${SOURCE_META[job.source].badge}`}>
                                        {SOURCE_META[job.source].label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-ink">{job.title}</div>
                                        <div className="truncate text-xs font-medium text-gray-500">
                                            {job.company ?? 'Unknown company'} · {job.location ?? 'Unknown location'}
                                        </div>
                                    </div>
                                    <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[job.status]}`}>
                                        {job.status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <aside className="flex w-[380px] flex-none flex-col gap-4 overflow-y-auto p-6">
                            {selectedJob ? (
                                <>
                                    <div>
                                        <div className="text-base font-bold text-ink">{selectedJob.title}</div>
                                        <div className="mt-1 text-xs font-semibold text-gray-500">
                                            {selectedJob.company ?? 'Unknown company'} · {selectedJob.location ?? 'Unknown location'}
                                        </div>
                                        {selectedJob.salary && (
                                            <span className="mt-2 inline-block rounded-full bg-brand-subtle px-2.5 py-1 text-[10.5px] font-bold text-brand-accent">
                                                {selectedJob.salary}
                                            </span>
                                        )}
                                    </div>

                                    {selectedJob.description && (
                                        <div>
                                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                Description
                                            </div>
                                            <p className="text-xs leading-relaxed text-ink">{selectedJob.description}</p>
                                        </div>
                                    )}

                                    {selectedJob.url && (
                                        <a
                                            href={selectedJob.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-semibold text-brand"
                                        >
                                            View original posting →
                                        </a>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            value={selectedJob.status}
                                            onChange={(e) => setStatus(selectedJob, e.target.value as Status)}
                                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold"
                                        >
                                            {(['New', 'Saved', 'Tailoring', 'Applied', 'Archived'] as Status[]).map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button
                                        type="button"
                                        className="w-full justify-center"
                                        onClick={stub('resume tailoring')}
                                    >
                                        Tailor resume to this job
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-center"
                                        onClick={stub('cover letter drafting')}
                                    >
                                        Draft cover letter
                                    </Button>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center px-6 text-center text-xs font-medium text-gray-400">
                                    Select a job from the list to see its details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg">
                    {toast}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
