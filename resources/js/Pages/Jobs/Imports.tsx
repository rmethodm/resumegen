import { Head, router, useHttp } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { useResumeAi } from '@/hooks/use-resume-ai';

// ponytail: gap analysis and cover letters are still toast stubs below.
// Search (Adzuna/USAJOBS) + persistence, and AI job match, are real.

type Source = 'adzuna' | 'usajobs';
type Status = 'New' | 'Saved' | 'Tailoring' | 'Applied' | 'Archived';

type ResumeOption = { id: number; title: string };

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
    Saved: 'bg-surface text-ink-muted',
    Tailoring: 'bg-brand-subtle text-brand-accent',
    Applied: 'bg-success-subtle text-success-text',
    Archived: 'bg-surface text-ink-faint',
};

function resultKey(job: SearchResult): string {
    return `${job.source}:${job.external_id}`;
}

export default function JobImportsPage({
    jobs,
    sourcesAvailable,
    resumes,
}: {
    jobs: ImportedJob[];
    sourcesAvailable: Source[];
    resumes: ResumeOption[];
}) {
    const [filter, setFilter] = useState<'all' | Source>('all');
    const [openJobId, setOpenJobId] = useState<number | null>(jobs[0]?.id ?? null);
    const [resumeId, setResumeId] = useState<number | null>(resumes[0]?.id ?? null);
    const [matchResult, setMatchResult] = useState<{
        jobId: number;
        score: number;
        summary: string;
        missing_skills: string[];
    } | null>(null);
    const ai = useResumeAi(resumeId ?? 0);
    const [toast, setToast] = useState<string | null>(null);
    // Search / extension are parked until ship-ready — UI stays visible but disabled.
    const [comingSoonOpen, setComingSoonOpen] = useState(true);
    const [searchOpen] = useState(false);
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

    const runMatch = async (job: ImportedJob) => {
        if (!resumeId) {
            showToast('Add a resume first to match against jobs.');
            return;
        }
        if (!job.description) {
            showToast('This job has no description to match against.');
            return;
        }

        const result = await ai.matchJob({
            job_description: job.description,
            target_role: job.title,
        });

        if (!result.ok) {
            showToast(result.message);
            return;
        }

        setMatchResult({
            jobId: job.id,
            score: result.score,
            summary: result.summary,
            missing_skills: result.missing_skills,
        });
    };

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
        <AuthenticatedLayout>
            <Head title="Job Imports" />

            {/* Same width/gutters as the top nav island: padding outside, 1440 container inside */}
            <div className="px-3 py-6 sm:px-4">
            <div className="mx-auto max-w-[1440px]">
                {sourcesAvailable.length === 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning-text">
                        Job search isn't configured on this server yet. Ask an admin to connect a job
                        board source to enable search.
                    </div>
                )}

                <div className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning-text">
                    <strong>Live:</strong> import list and AI job match.{' '}
                    <strong>Coming soon:</strong> board search, browser extension, gap analysis, and
                    cover-letter drafting.
                    {ai.status && !ai.status.enabled && ' AI is currently disabled.'}
                </div>

                <div className="mt-6 overflow-hidden rounded-lg border border-surface-border/80 bg-white shadow-ambient">
                    <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-base font-bold text-ink">Job imports</h1>
                            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-bold tabular-nums text-brand-accent">
                                {jobs.length} jobs
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            <Button type="button" variant="outline" disabled className="min-h-11 gap-2">
                                Search jobs
                                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-faint">
                                    Coming soon
                                </span>
                            </Button>
                            <Button type="button" variant="outline" disabled className="min-h-11 gap-2">
                                Browser extension
                                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-faint">
                                    Coming soon
                                </span>
                            </Button>
                        </div>
                    </div>

                    {searchOpen && (
                        <div className="border-b border-surface-border bg-surface px-6 py-4">
                            <form onSubmit={runSearch} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-ink-muted">Keyword</label>
                                    <input
                                        type="text"
                                        value={data.keyword}
                                        onChange={(e) => setData('keyword', e.target.value)}
                                        placeholder="e.g. Product Designer"
                                        className="rounded-lg border border-surface-border px-3 py-1.5 text-sm"
                                    />
                                    {errors.keyword && <div className="mt-1 text-xs text-danger">{errors.keyword}</div>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-ink-muted">Location</label>
                                    <input
                                        type="text"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder="e.g. Remote"
                                        className="rounded-lg border border-surface-border px-3 py-1.5 text-sm"
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
                                <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-surface-border bg-white">
                                    {searchResults.map((job) => {
                                        const key = resultKey(job);
                                        const checked = selectedResults.has(key);
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => toggleResult(job)}
                                                className="flex cursor-pointer items-center gap-3 border-b border-surface-border px-4 py-2.5 last:border-b-0 hover:bg-surface"
                                            >
                                                <span className={checked ? 'text-brand' : 'text-ink-faint'}>
                                                    {checked ? '☑' : '☐'}
                                                </span>
                                                <span className={`w-fit rounded px-1.5 py-1 text-[9.5px] font-bold ${SOURCE_META[job.source].badge}`}>
                                                    {SOURCE_META[job.source].label}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-bold text-ink">{job.title}</div>
                                                    <div className="truncate text-xs font-medium text-ink-muted">
                                                        {job.company ?? 'Unknown company'} · {job.location ?? 'Unknown location'}
                                                    </div>
                                                </div>
                                                {job.salary && (
                                                    <span className="text-xs font-semibold text-ink-muted">{job.salary}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {processing === false && searchResults.length === 0 && data.keyword !== '' && (
                                <div className="mt-3 text-xs text-ink-faint">
                                    No results yet — try a search, or check that a source is configured above.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 border-b border-surface-border px-6 pt-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`border-b-2 pb-2.5 text-xs font-semibold ${
                                    filter === tab.key ? 'border-brand text-brand-accent' : 'border-transparent text-ink-faint'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-0" style={{ height: 480 }}>
                        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-surface-border">
                            {filtered.length === 0 && (
                                <div className="px-6 py-10 text-center text-xs font-medium text-ink-faint">
                                    No imported jobs from this source yet. Use "Search jobs" above to find some.
                                </div>
                            )}
                            {filtered.map((job) => (
                                <div
                                    key={job.id}
                                    onClick={() => setOpenJobId(job.id)}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-surface-border px-5 py-3 hover:bg-surface ${
                                        job.id === openJobId ? 'bg-brand-subtle/40' : ''
                                    }`}
                                >
                                    <span className={`w-fit rounded px-1.5 py-1 text-[9.5px] font-bold ${SOURCE_META[job.source].badge}`}>
                                        {SOURCE_META[job.source].label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-ink">{job.title}</div>
                                        <div className="truncate text-xs font-medium text-ink-muted">
                                            {job.company ?? 'Unknown company'} · {job.location ?? 'Unknown location'}
                                        </div>
                                    </div>
                                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META[job.status]}`}>
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
                                        <div className="mt-1 text-xs font-semibold text-ink-muted">
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
                                            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
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
                                            className="min-h-11 rounded-lg border border-surface-border px-2 py-1.5 text-xs font-semibold"
                                        >
                                            {(['New', 'Saved', 'Tailoring', 'Applied', 'Archived'] as Status[]).map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {resumes.length > 0 && (
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-faint">
                                                Match against resume
                                            </label>
                                            <select
                                                value={resumeId ?? ''}
                                                onChange={(e) => setResumeId(Number(e.target.value))}
                                                className="w-full rounded-lg border border-surface-border px-2 py-1.5 text-xs font-semibold"
                                            >
                                                {resumes.map((resume) => (
                                                    <option key={resume.id} value={resume.id}>
                                                        {resume.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        className="min-h-11 w-full justify-center"
                                        onClick={() => runMatch(selectedJob)}
                                        disabled={ai.busy || !ai.status?.enabled || resumes.length === 0}
                                    >
                                        {ai.busy ? 'Matching…' : 'Tailor resume to this job'}
                                    </Button>

                                    {matchResult && matchResult.jobId === selectedJob.id && (
                                        <div className="rounded-lg border border-surface-border bg-surface p-3">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                                                    Match score
                                                </span>
                                                <span className="text-sm font-bold tabular-nums text-brand-accent">
                                                    {matchResult.score}%
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs leading-relaxed text-ink">{matchResult.summary}</p>
                                            {matchResult.missing_skills.length > 0 && (
                                                <>
                                                    <div className="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                                        Missing skills
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {matchResult.missing_skills.map((skill) => (
                                                            <span
                                                                key={skill}
                                                                className="rounded-full border border-warning/40 bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning-text"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-11 w-full justify-center gap-2"
                                        disabled
                                        title="Cover letter drafting is not implemented yet"
                                    >
                                        Draft cover letter
                                        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-faint">
                                            Coming soon
                                        </span>
                                    </Button>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center px-6 text-center text-xs font-medium text-ink-faint">
                                    Select a job from the list to see its details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
            </div>

            {toast && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg">
                    {toast}
                </div>
            )}

            <Modal
                show={comingSoonOpen}
                onClose={() => setComingSoonOpen(false)}
                maxWidth="sm"
                title="Coming Soon."
                footer={
                    <div className="flex justify-end">
                        <Button type="button" onClick={() => setComingSoonOpen(false)}>
                            OK
                        </Button>
                    </div>
                }
            >
                <p className="px-5 py-4 text-sm text-ink-muted">
                    Job board search and the browser extension are not available yet.
                </p>
            </Modal>
        </AuthenticatedLayout>
    );
}
