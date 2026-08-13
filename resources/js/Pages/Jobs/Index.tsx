import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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

const CARD_SHADOW = 'shadow-[0_1px_3px_rgba(79,70,229,0.05)]';

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
    const tone = score >= 80 ? 'bg-emerald-50 text-emerald-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500';

    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{score}% match</span>;
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
                            <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Jobs</h1>
                            <p className="mt-1 text-sm text-[#a0a0b0]">
                                {sources.length
                                    ? `Searching ${sources.map((s) => SOURCE_LABELS[s] ?? s).join(' and ')}.`
                                    : 'No job sources configured yet — add API keys to start searching.'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={runSearch} className={`mb-6 rounded-xl border border-[#eeeef5] bg-white p-4 ${CARD_SHADOW}`}>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder="Job title or keywords"
                                required
                                maxLength={200}
                                className="flex-1 rounded-lg border-[#eeeef5] text-sm placeholder:text-[#a0a0b0] focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City or state"
                                disabled={scope === 'national'}
                                maxLength={120}
                                className="flex-1 rounded-lg border-[#eeeef5] text-sm placeholder:text-[#a0a0b0] focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-[#fafafe] disabled:text-[#a0a0b0]"
                            />
                            <button
                                type="submit"
                                disabled={searching || !sources.length}
                                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {searching ? 'Searching…' : 'Search'}
                            </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {SCOPES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setScope(s.value)}
                                    title={s.hint}
                                    className={`rounded-full px-3 py-1 text-[13px] font-medium transition ${
                                        scope === s.value ? 'bg-indigo-50 text-indigo-600' : 'text-[#71717a] hover:bg-[#fafafe]'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </form>

                    {notice && (
                        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{notice}</div>
                    )}

                    {results.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <select
                                value={resumeId}
                                onChange={(e) => setResumeId(Number(e.target.value))}
                                className="rounded-lg border-[#eeeef5] text-[13px] focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value={0}>Select a resume…</option>
                                {resumes.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={rankResults}
                                disabled={ranking}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-[13px] font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                            >
                                <SparklesIcon className="h-4 w-4" />
                                {ranking ? 'Scoring…' : 'Score against my resume'}
                            </button>
                            <button
                                onClick={() => setSaving(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eeeef5] px-3 py-1.5 text-[13px] font-medium text-[#71717a] transition hover:bg-[#fafafe]"
                            >
                                <BookmarkIcon className="h-4 w-4" />
                                Save this search
                            </button>
                        </div>
                    )}

                    {ordered.length === 0 ? (
                        <div className={`rounded-xl border border-[#eeeef5] bg-white py-20 text-center ${CARD_SHADOW}`}>
                            <div className="mx-auto w-fit rounded-xl bg-indigo-50 p-4">
                                <BriefcaseIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <p className="mt-4 font-semibold text-[#0f0f1a]">
                                {hasSearched ? 'No openings matched that search' : 'Search for openings'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#a0a0b0]">
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
                                        className={`rounded-xl border border-[#eeeef5] bg-white p-4 text-left transition hover:bg-[#fafafe] ${CARD_SHADOW}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold leading-snug text-[#0f0f1a]">{listing.title}</p>
                                            {score && <ScoreBadge score={score.score} />}
                                        </div>
                                        <p className="mt-1 text-[13px] text-[#71717a]">{listing.company ?? 'Unknown company'}</p>
                                        <p className="text-[13px] text-[#a0a0b0]">{listing.location ?? '—'}</p>
                                        {salary && <p className="mt-2 text-[13px] font-medium text-[#0f0f1a]">{salary}</p>}
                                        {score?.reason && <p className="mt-2 text-[13px] italic text-[#71717a]">{score.reason}</p>}
                                        <p className="mt-3 text-[11px] uppercase tracking-wide text-[#a0a0b0]">
                                            {SOURCE_LABELS[listing.source] ?? listing.source}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <form onSubmit={submitImport} className={`mt-6 rounded-xl border border-[#eeeef5] bg-white p-4 ${CARD_SHADOW}`}>
                        <p className="text-[13px] font-semibold text-[#0f0f1a]">Found a posting somewhere else?</p>
                        <p className="mt-1 text-[13px] text-[#a0a0b0]">Paste its link and we'll read the page for you.</p>
                        <div className="mt-3 flex gap-2">
                            <input
                                type="url"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                placeholder="https://…"
                                required
                                maxLength={500}
                                className="flex-1 rounded-lg border-[#eeeef5] text-sm placeholder:text-[#a0a0b0] focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={importing}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eeeef5] px-3 py-1.5 text-[13px] font-medium text-[#71717a] transition hover:bg-[#fafafe] disabled:opacity-50"
                            >
                                <LinkIcon className="h-4 w-4" />
                                {importing ? 'Reading…' : 'Read posting'}
                            </button>
                        </div>
                    </form>

                    {searches.length > 0 && (
                        <div className="mt-8">
                            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#a0a0b0]">Saved searches</h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {searches.map((search) => (
                                    <div key={search.id} className={`rounded-xl border border-[#eeeef5] bg-white p-4 ${CARD_SHADOW}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-[#0f0f1a]">{search.label}</p>
                                            <button
                                                onClick={() => router.delete(route('jobs.saved.destroy', search.id), { preserveScroll: true })}
                                                className="text-[#a0a0b0] transition hover:text-red-500"
                                                aria-label={`Delete ${search.label}`}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="mt-1 text-[13px] text-[#71717a]">
                                            {search.keywords} · {search.scope === 'national' ? 'National' : search.location}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#a0a0b0]">
                                            {search.last_run_at ? `Last checked ${search.last_run_at}` : 'Not checked yet'}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <button
                                                onClick={() => runSaved(search)}
                                                className="text-[13px] font-medium text-indigo-600 transition hover:text-indigo-500"
                                            >
                                                Load
                                            </button>
                                            <label className="flex items-center gap-1.5 text-[13px] text-[#71717a]">
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
                                                    className="rounded border-[#eeeef5] text-indigo-600 focus:ring-indigo-500"
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
                    <h2 className="font-semibold text-[#0f0f1a]">Save this search</h2>
                    <p className="mt-1 text-[13px] text-[#a0a0b0]">
                        {keywords} · {scope === 'national' ? 'National' : location || 'Anywhere'}
                    </p>
                    <input
                        value={saveForm.data.label}
                        onChange={(e) => saveForm.setData('label', e.target.value)}
                        placeholder="Name this search"
                        required
                        maxLength={120}
                        className="mt-4 w-full rounded-lg border-[#eeeef5] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <label className="mt-3 flex items-center gap-2 text-[13px] text-[#71717a]">
                        <input
                            type="checkbox"
                            checked={saveForm.data.is_alerting}
                            onChange={(e) => saveForm.setData('is_alerting', e.target.checked)}
                            className="rounded border-[#eeeef5] text-indigo-600 focus:ring-indigo-500"
                        />
                        Email me new matches daily
                    </label>
                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setSaving(false)}
                            className="rounded-lg px-3 py-1.5 text-sm text-[#71717a] transition hover:bg-[#fafafe]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saveForm.processing}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={detailFor !== null} onClose={() => setDetailFor(null)} maxWidth="2xl">
                {detailFor && (
                    <div className="p-6">
                        <h2 className="font-semibold text-[#0f0f1a]">{detailFor.title}</h2>
                        <p className="mt-1 text-[13px] text-[#71717a]">
                            {detailFor.company ?? 'Unknown company'} · {detailFor.location ?? '—'}
                        </p>
                        {scores[listingKey(detailFor)] && (
                            <p className="mt-3 text-[13px] text-[#71717a]">
                                <ScoreBadge score={scores[listingKey(detailFor)].score} />{' '}
                                <span className="italic">{scores[listingKey(detailFor)].reason}</span>
                            </p>
                        )}
                        <p className="mt-4 max-h-80 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed text-[#71717a]">
                            {detailFor.description ?? 'No description provided.'}
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setDetailFor(null)}
                                className="rounded-lg px-3 py-1.5 text-sm text-[#71717a] transition hover:bg-[#fafafe]"
                            >
                                Close
                            </button>
                            {detailFor.url && (
                                <a
                                    href={detailFor.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
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
