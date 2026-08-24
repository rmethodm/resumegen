import Modal from '@/Components/Modal';
import { Button, buttonClassName } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn, focusRingClass } from '@/lib/utils';
import { PageProps } from '@/types';
import { BookmarkIcon, BriefcaseIcon, LinkIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface Listing {
    source: string;
    external_id: string;
    title: string;
    company: string | null;
    location: string | null;
    url: string | null;
    description: string | null;
    salary_min: number | null;
    salary_max: number | null;
    posted_at: string | null;
}

interface Score {
    score: number;
    reason: string;
}

interface SavedSearch {
    id: number;
    label: string;
    keywords: string;
    location: string | null;
    scope: Scope;
    resume_id: number | null;
    is_alerting: boolean;
    listings_count: number;
    last_run_at: string | null;
}

interface ResumeOption {
    id: number;
    name: string;
}

type Scope = 'local' | 'state' | 'national';

type Props = PageProps<{
    searches: SavedSearch[];
    resumes: ResumeOption[];
    sources: string[];
}>;

const CARD_SHADOW = 'shadow-card';

const fieldFocusClass = cn('focus:border-brand focus:ring-0', focusRingClass);

const SCOPES: { value: Scope; label: string; hint: string }[] = [
    { value: 'local', label: 'Local', hint: 'Within 25 miles' },
    { value: 'state', label: 'State', hint: 'Within 150 miles' },
    { value: 'national', label: 'National', hint: 'Anywhere' },
];

const SOURCE_LABELS: Record<string, string> = {
    adzuna: 'Adzuna',
    usajobs: 'USAJobs',
    url: 'Pasted link',
};

function listingKey(listing: Listing): string {
    return `${listing.source}:${listing.external_id}`;
}

/**
 * These endpoints return JSON rather than an Inertia response, so they go
 * through fetch like the other XHR calls in the builder.
 */
async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
        },
        body: JSON.stringify(body),
    });

    return { ok: res.ok, data: await res.json() };
}

function formatSalary(min: number | null, max: number | null): string | null {
    if (!min && !max) {
        return null;
    }
    const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
    if (min && max) {
        return `${fmt(min)}–${fmt(max)}`;
    }
    return fmt((min ?? max) as number);
}

function ScoreBadge({ score }: { score: number }) {
    const tone = score >= 80 ? 'bg-success-subtle text-success-text' : score >= 50 ? 'bg-warning-subtle text-warning-text' : 'bg-surface text-ink-muted';

    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{score}% match</span>;
}

export default function JobsIndex() {
    const { searches, resumes, sources } = usePage<Props>().props;

    const [results, setResults] = useState<Listing[]>([]);
    const [scores, setScores] = useState<Record<string, Score>>({});
    const [searching, setSearching] = useState(false);
    const [ranking, setRanking] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [detailFor, setDetailFor] = useState<Listing | null>(null);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importUrl, setImportUrl] = useState('');

    const [keywords, setKeywords] = useState('');
    const [location, setLocation] = useState('');
    const [scope, setScope] = useState<Scope>('local');
    const [resumeId, setResumeId] = useState<number>(resumes[0]?.id ?? 0);

    const saveForm = useForm({ label: '', keywords: '', location: '', scope: 'local' as Scope, resume_id: 0, is_alerting: true });

    async function runSearch(e: FormEvent) {
        e.preventDefault();
        setSearching(true);
        setNotice(null);
        setScores({});

        try {
            const { ok, data } = await postJson(route('jobs.search'), { keywords, location, scope });
            if (!ok) {
                setNotice('Search failed. Try again in a moment.');
                return;
            }
            setResults((data.results ?? []) as unknown as Listing[]);
            setHasSearched(true);
        } catch {
            setNotice('Search failed. Try again in a moment.');
        } finally {
            setSearching(false);
        }
    }

    // Scoring is opt-in: searching alone never spends the monthly AI quota.
    async function rankResults() {
        if (!resumeId) {
            setNotice('Pick a resume to score against.');
            return;
        }
        setRanking(true);
        setNotice(null);

        try {
            const { ok, data } = await postJson(route('jobs.rank'), {
                resume_id: resumeId,
                listings: results.slice(0, 25).map((l) => ({
                    id: listingKey(l),
                    title: l.title,
                    company: l.company,
                    description: (l.description ?? '').slice(0, 4000),
                })),
            });
            if (!ok) {
                setNotice((data.error as string | undefined) ?? 'Scoring failed. Try again in a moment.');
                return;
            }
            setScores((data.scores ?? {}) as unknown as Record<string, Score>);
        } catch {
            setNotice('Scoring failed. Try again in a moment.');
        } finally {
            setRanking(false);
        }
    }

    async function submitImport(e: FormEvent) {
        e.preventDefault();
        setImporting(true);
        setNotice(null);

        try {
            const { ok, data } = await postJson(route('jobs.import-url'), { url: importUrl });
            if (!ok) {
                setNotice((data.error as string | undefined) ?? 'Could not read that posting.');
                return;
            }
            setResults((prev) => [data.listing as unknown as Listing, ...prev]);
            setHasSearched(true);
            setImportUrl('');
        } catch {
            setNotice('Could not read that posting.');
        } finally {
            setImporting(false);
        }
    }

    function submitSave(e: FormEvent) {
        e.preventDefault();
        saveForm.transform((data) => ({ ...data, keywords, location, scope, resume_id: resumeId || null }));
        saveForm.post(route('jobs.saved.store'), {
            preserveScroll: true,
            onSuccess: () => {
                saveForm.reset('label');
                setSaving(false);
            },
        });
    }

    function runSaved(search: SavedSearch) {
        setKeywords(search.keywords);
        setLocation(search.location ?? '');
        setScope(search.scope);
        if (search.resume_id) {
            setResumeId(search.resume_id);
        }
    }

    const ordered = Object.keys(scores).length
        ? [...results].sort((a, b) => (scores[listingKey(b)]?.score ?? -1) - (scores[listingKey(a)]?.score ?? -1))
        : results;

    return (
        <AuthenticatedLayout>
            <Head title="Jobs" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-ink">Jobs</h1>
                            <p className="mt-1 text-sm text-ink-faint">
                                {sources.length
                                    ? `Searching ${sources.map((s) => SOURCE_LABELS[s] ?? s).join(' and ')}.`
                                    : 'No job sources configured yet — add API keys to start searching.'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={runSearch} className={`mb-6 rounded-xl border border-surface-border bg-white p-4 ${CARD_SHADOW}`}>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <label htmlFor="jobs-keywords" className="sr-only">
                                Job title or keywords
                            </label>
                            <input
                                id="jobs-keywords"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder="Job title or keywords"
                                required
                                maxLength={200}
                                className={cn('flex-1 rounded-lg border-surface-border text-sm placeholder:text-ink-faint', fieldFocusClass)}
                            />
                            <label htmlFor="jobs-location" className="sr-only">
                                City or state
                            </label>
                            <input
                                id="jobs-location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City or state"
                                disabled={scope === 'national'}
                                maxLength={120}
                                className={cn(
                                    'flex-1 rounded-lg border-surface-border text-sm placeholder:text-ink-faint disabled:bg-surface disabled:text-ink-faint',
                                    fieldFocusClass,
                                )}
                            />
                            <Button type="submit" disabled={searching || !sources.length} className="min-h-11">
                                {searching ? 'Searching…' : 'Search'}
                            </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {SCOPES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setScope(s.value)}
                                    title={s.hint}
                                    className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                                        scope === s.value ? 'bg-brand-subtle text-brand' : 'text-ink-muted hover:bg-surface'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </form>

                    {notice && (
                        <div className="mb-4 rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-text">{notice}</div>
                    )}

                    {results.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <select
                                value={resumeId}
                                onChange={(e) => setResumeId(Number(e.target.value))}
                                aria-label="Resume to score against"
                                className={cn('rounded-lg border-surface-border text-sm', fieldFocusClass)}
                            >
                                <option value={0}>Select a resume…</option>
                                {resumes.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={rankResults}
                                disabled={ranking}
                                className="min-h-11 border-brand/30 text-brand hover:bg-brand-subtle"
                            >
                                <SparklesIcon className="h-4 w-4" />
                                {ranking ? 'Scoring…' : 'Score against my resume'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setSaving(true)} className="min-h-11 text-ink-muted">
                                <BookmarkIcon className="h-4 w-4" />
                                Save this search
                            </Button>
                        </div>
                    )}

                    {ordered.length === 0 ? (
                        <div className={`rounded-xl border border-surface-border bg-white py-20 text-center ${CARD_SHADOW}`}>
                            <div className="mx-auto w-fit rounded-xl bg-brand-subtle p-4">
                                <BriefcaseIcon className="h-6 w-6 text-brand" />
                            </div>
                            <p className="mt-4 font-semibold text-ink">
                                {hasSearched ? 'No openings matched that search' : 'Search for openings'}
                            </p>
                            <p className="mt-1 text-sm text-ink-faint">
                                {hasSearched ? 'Try broader keywords or widen the scope.' : 'Local, statewide, or nationwide.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {ordered.map((listing) => {
                                const score = scores[listingKey(listing)];
                                const salary = formatSalary(listing.salary_min, listing.salary_max);

                                return (
                                    <button
                                        key={listingKey(listing)}
                                        onClick={() => setDetailFor(listing)}
                                        className={`rounded-xl border border-surface-border bg-white p-4 text-left transition hover:bg-surface ${CARD_SHADOW}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold leading-snug text-ink">{listing.title}</p>
                                            {score && <ScoreBadge score={score.score} />}
                                        </div>
                                        <p className="mt-1 text-sm text-ink-muted">{listing.company ?? 'Unknown company'}</p>
                                        <p className="text-sm text-ink-faint">{listing.location ?? '—'}</p>
                                        {salary && <p className="mt-2 text-sm font-medium text-ink">{salary}</p>}
                                        {score?.reason && <p className="mt-2 text-sm italic text-ink-muted">{score.reason}</p>}
                                        <p className="mt-3 text-xs uppercase tracking-wide text-ink-faint">
                                            {SOURCE_LABELS[listing.source] ?? listing.source}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <form onSubmit={submitImport} className={`mt-6 rounded-xl border border-surface-border bg-white p-4 ${CARD_SHADOW}`}>
                        <p className="text-sm font-semibold text-ink">Found a posting somewhere else?</p>
                        <p className="mt-1 text-sm text-ink-faint">Paste its link and we'll read the page for you.</p>
                        <div className="mt-3 flex gap-2">
                            <input
                                type="url"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                placeholder="https://…"
                                required
                                maxLength={500}
                                aria-label="Job posting URL"
                                className={cn('flex-1 rounded-lg border-surface-border text-sm placeholder:text-ink-faint', fieldFocusClass)}
                            />
                            <button
                                type="submit"
                                disabled={importing}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface disabled:opacity-50"
                            >
                                <LinkIcon className="h-4 w-4" />
                                {importing ? 'Reading…' : 'Read posting'}
                            </button>
                        </div>
                    </form>

                    {searches.length > 0 && (
                        <div className="mt-8">
                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">Saved searches</h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {searches.map((search) => (
                                    <div key={search.id} className={`rounded-xl border border-surface-border bg-white p-4 ${CARD_SHADOW}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-ink">{search.label}</p>
                                            <button
                                                onClick={() => router.delete(route('jobs.saved.destroy', search.id), { preserveScroll: true })}
                                                className="text-ink-faint transition hover:text-danger"
                                                aria-label={`Delete ${search.label}`}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="mt-1 text-sm text-ink-muted">
                                            {search.keywords} · {search.scope === 'national' ? 'National' : search.location}
                                        </p>
                                        <p className="mt-1 text-xs text-ink-faint">
                                            {search.last_run_at ? `Last checked ${search.last_run_at}` : 'Not checked yet'}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <button
                                                onClick={() => runSaved(search)}
                                                className={cn('rounded-md text-sm font-medium text-brand transition hover:underline', focusRingClass)}
                                            >
                                                Load
                                            </button>
                                            <label className="flex items-center gap-1.5 text-sm text-ink-muted">
                                                <input
                                                    type="checkbox"
                                                    checked={search.is_alerting}
                                                    onChange={(e) =>
                                                        router.patch(
                                                            route('jobs.saved.update', search.id),
                                                            { is_alerting: e.target.checked },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className={cn('rounded-sm border-surface-border text-brand focus:ring-0', focusRingClass)}
                                                />
                                                Daily email
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal show={saving} onClose={() => setSaving(false)} maxWidth="md">
                <form onSubmit={submitSave} className="p-6">
                    <h2 className="font-semibold text-ink">Save this search</h2>
                    <p className="mt-1 text-sm text-ink-faint">
                        {keywords} · {scope === 'national' ? 'National' : location || 'Anywhere'}
                    </p>
                    <label htmlFor="jobs-save-label" className="sr-only">
                        Name this search
                    </label>
                    <input
                        id="jobs-save-label"
                        value={saveForm.data.label}
                        onChange={(e) => saveForm.setData('label', e.target.value)}
                        placeholder="Name this search"
                        required
                        maxLength={120}
                        className={cn('mt-4 w-full rounded-lg border-surface-border text-sm', fieldFocusClass)}
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                        <input
                            type="checkbox"
                            checked={saveForm.data.is_alerting}
                            onChange={(e) => saveForm.setData('is_alerting', e.target.checked)}
                            className={cn('rounded-sm border-surface-border text-brand focus:ring-0', focusRingClass)}
                        />
                        Email me new matches daily
                    </label>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setSaving(false)} className="min-h-11">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saveForm.processing} className="min-h-11">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal show={detailFor !== null} onClose={() => setDetailFor(null)} maxWidth="2xl">
                {detailFor && (
                    <div className="p-6">
                        <h2 className="font-semibold text-ink">{detailFor.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                            {detailFor.company ?? 'Unknown company'} · {detailFor.location ?? '—'}
                        </p>
                        {scores[listingKey(detailFor)] && (
                            <p className="mt-3 text-sm text-ink-muted">
                                <ScoreBadge score={scores[listingKey(detailFor)].score} />{' '}
                                <span className="italic">{scores[listingKey(detailFor)].reason}</span>
                            </p>
                        )}
                        <p className="mt-4 max-h-80 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                            {detailFor.description ?? 'No description provided.'}
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setDetailFor(null)} className="min-h-11">
                                Close
                            </Button>
                            {detailFor.url && (
                                <a
                                    href={detailFor.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonClassName('default', 'default', 'min-h-11')}
                                >
                                    Open posting
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
