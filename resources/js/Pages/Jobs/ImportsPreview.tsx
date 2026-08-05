import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

// ponytail: UI-shell preview only. Job import, matching, tailoring, and cover
// letters are all removed features (see CLAUDE.md "Removed Features") — every
// action below is a local-state stub. Wiring this to real data is a separate,
// explicit product decision.

type Source = 'linkedin' | 'indeed' | 'company';
type Status = 'Tailoring' | 'Saved' | 'Applied' | 'Archived' | 'New';

type ImportedJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    source: Source;
    hoursAgo: number;
    importedLabel: string;
    match: number;
    status: Status;
    salary: string;
    posted: string;
    applicants: string;
    urlLabel: string;
    matched: string[];
    missing: string[];
    requirements: string[];
};

const DEMO_JOBS: ImportedJob[] = [
    { id: 'j1', title: 'Staff Product Designer', company: 'Vantage', location: 'Remote', source: 'linkedin', hoursAgo: 2, importedLabel: '2 hours ago', match: 91, status: 'Tailoring', salary: '$165K–$195K', posted: 'Posted 3d ago', applicants: '200+', urlLabel: 'linkedin.com/jobs/...', matched: ['Product design leadership', 'Design systems ownership'], missing: ['Data-driven experimentation'], requirements: ['5+ years product design experience', 'Track record owning design systems', 'Experience with data-driven experimentation', 'Strong Figma-to-code handoff practice'] },
    { id: 'j2', title: 'Senior Product Designer', company: 'Bramble', location: 'Austin, TX', source: 'indeed', hoursAgo: 24, importedLabel: 'Yesterday', match: 84, status: 'Saved', salary: '$140K–$160K', posted: 'Posted 5d ago', applicants: '80+', urlLabel: 'indeed.com/viewjob?...', matched: ['Cross-functional collaboration', 'User research'], missing: ['Motion design'], requirements: ['4+ years in product design', 'Comfort partnering directly with engineering', 'Portfolio of shipped consumer products'] },
    { id: 'j3', title: 'Design Lead, Platform', company: 'Northwind', location: 'Hybrid — NYC', source: 'company', hoursAgo: 48, importedLabel: '2 days ago', match: 68, status: 'Saved', salary: 'Not disclosed', posted: 'Posted 1w ago', applicants: '—', urlLabel: 'northwind.com/careers/...', matched: ['Platform design'], missing: ['Accessibility auditing', 'Design ops'], requirements: ['7+ years, 2+ leading a design team', 'Experience scaling a design system across teams', 'Accessibility (WCAG) fluency'] },
    { id: 'j4', title: 'Product Designer II', company: 'Fernwood', location: 'Remote', source: 'linkedin', hoursAgo: 72, importedLabel: '3 days ago', match: 79, status: 'Applied', salary: '$120K–$140K', posted: 'Posted 2w ago', applicants: '150+', urlLabel: 'linkedin.com/jobs/...', matched: ['Prototyping', 'Stakeholder communication'], missing: ['SQL'], requirements: ['3+ years product design experience', 'Strong prototyping (Figma, Framer)', 'Comfortable presenting to execs'] },
    { id: 'j5', title: 'UX Designer, Growth', company: 'Cedar Labs', location: 'San Francisco, CA', source: 'indeed', hoursAgo: 96, importedLabel: '4 days ago', match: 61, status: 'Saved', salary: '$110K–$130K', posted: 'Posted 3w ago', applicants: '300+', urlLabel: 'indeed.com/viewjob?...', matched: ['Growth experimentation'], missing: ['Data-driven experimentation', 'A/B testing analysis'], requirements: ['Experience on a growth or lifecycle team', 'Comfortable reading experiment results', 'Bias toward shipping fast, iterating often'] },
    { id: 'j6', title: 'Senior UX Researcher', company: 'Anchor & Co', location: 'Remote', source: 'company', hoursAgo: 120, importedLabel: '5 days ago', match: 55, status: 'Archived', salary: 'Not disclosed', posted: 'Posted 1mo ago', applicants: '—', urlLabel: 'anchorandco.com/jobs/...', matched: ['User interviews'], missing: ['Quant research', 'Survey design'], requirements: ['5+ years UX research experience', 'Mixed-methods practice', 'Comfortable owning a research repository'] },
];

const SOURCE_META: Record<Source, { badge: string; label: string }> = {
    linkedin: { badge: 'bg-blue-100 text-blue-700', label: 'in LinkedIn' },
    indeed: { badge: 'bg-green-100 text-green-700', label: 'in Indeed' },
    company: { badge: 'bg-purple-100 text-purple-700', label: '🌐 Company site' },
};

const STATUS_META: Record<Status, string> = {
    Tailoring: 'bg-brand-subtle text-brand-accent',
    Saved: 'bg-gray-100 text-gray-500',
    Applied: 'bg-green-100 text-green-700',
    Archived: 'bg-gray-100 text-gray-400',
    New: 'bg-green-100 text-green-700',
};

function matchColor(match: number): string {
    if (match >= 80) return 'text-green-600';
    if (match >= 60) return 'text-amber-600';
    return 'text-red-600';
}

export default function JobImportsPreview() {
    const [jobs, setJobs] = useState<ImportedJob[]>(DEMO_JOBS);
    const [filter, setFilter] = useState<'all' | Source>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [openJobId, setOpenJobId] = useState<string | null>(DEMO_JOBS[0]?.id ?? null);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    const showToast = (message: string) => {
        setToast(message);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2200);
    };
    const stub = (message: string) => () => showToast(`Preview only — ${message} is not implemented.`);

    const toggleSelect = (id: string) => {
        setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    };

    const archiveSelected = () => {
        const ids = selectedIds;
        setJobs((list) => list.map((j) => (ids.includes(j.id) ? { ...j, status: 'Archived' } : j)));
        setSelectedIds([]);
        showToast(`Archived ${ids.length} job${ids.length === 1 ? '' : 's'} (preview only)`);
    };

    const importDemo = () => {
        const id = `demo-${jobs.length + 1}`;
        const job: ImportedJob = {
            id,
            title: 'Senior Product Designer, Marketplace',
            company: 'Halcyon',
            location: 'Remote',
            source: 'linkedin',
            hoursAgo: 0,
            importedLabel: 'Just now',
            match: 74,
            status: 'New',
            salary: '$150K–$170K',
            posted: 'Posted today',
            applicants: '20+',
            urlLabel: 'linkedin.com/jobs/...',
            matched: ['Marketplace design', 'Prototyping'],
            missing: ['Growth experimentation'],
            requirements: ['4+ years product design', 'Marketplace or two-sided platform experience', 'Strong systems thinking'],
        };
        setJobs((list) => [job, ...list]);
        setOpenJobId(id);
        showToast('Preview only — job import is not implemented.');
    };

    const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.source === filter);
    const sorted = [...filtered].sort((a, b) => a.hoursAgo - b.hoursAgo);
    const selectedJob = openJobId ? (jobs.find((j) => j.id === openJobId) ?? null) : null;

    const tabs: { key: 'all' | Source; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: jobs.length },
        { key: 'linkedin', label: 'LinkedIn', count: jobs.filter((j) => j.source === 'linkedin').length },
        { key: 'indeed', label: 'Indeed', count: jobs.filter((j) => j.source === 'indeed').length },
        { key: 'company', label: 'Company sites', count: jobs.filter((j) => j.source === 'company').length },
    ];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Imported jobs (design preview)
                </h2>
            }
        >
            <Head title="Imported jobs (preview)" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <strong>Design preview.</strong> Demo data only — job import, resume
                    matching, tailoring, and cover-letter drafting are stubs, not real
                    features.
                </div>

                <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                        <h1 className="text-base font-bold text-ink">Imported jobs</h1>
                        <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[11px] font-bold text-brand-accent">
                            {jobs.length} jobs
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                            Extension connected
                        </span>
                        <div className="ml-auto flex gap-2">
                            <SecondaryButton onClick={importDemo}>+ Import from URL</SecondaryButton>
                            <Link href={route('profile.edit')}>
                                <PrimaryButton type="button">Get browser extension</PrimaryButton>
                            </Link>
                        </div>
                    </div>

                    <div className="flex gap-2 border-b border-gray-100 px-6 pt-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`border-b-2 pb-2.5 text-xs font-semibold ${
                                    filter === tab.key
                                        ? 'border-brand text-brand-accent'
                                        : 'border-transparent text-gray-400'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-0" style={{ height: 560 }}>
                        <div className="flex min-w-0 flex-1 flex-col border-r border-gray-100">
                            <div className="grid grid-cols-[26px_1fr_130px_110px_90px_100px] gap-3.5 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                <span />
                                <span>Role</span>
                                <span>Source</span>
                                <span>Imported</span>
                                <span>Match</span>
                                <span>Status</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {sorted.map((job) => {
                                    const source = SOURCE_META[job.source];
                                    const checked = selectedIds.includes(job.id);
                                    return (
                                        <div
                                            key={job.id}
                                            onClick={() => setOpenJobId(job.id)}
                                            className={`grid cursor-pointer grid-cols-[26px_1fr_130px_110px_90px_100px] items-center gap-3.5 border-b border-gray-100 px-5 py-3 hover:bg-gray-50 ${
                                                job.id === openJobId ? 'bg-brand-subtle/40' : ''
                                            }`}
                                        >
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(job.id);
                                                }}
                                                className={checked ? 'text-brand' : 'text-gray-300'}
                                            >
                                                {checked ? '☑' : '☐'}
                                            </span>
                                            <div>
                                                <div className="text-sm font-bold text-ink">{job.title}</div>
                                                <div className="mt-0.5 text-xs font-medium text-gray-500">
                                                    {job.company} · {job.location}
                                                </div>
                                            </div>
                                            <span className={`w-fit rounded px-1.5 py-1 text-[9.5px] font-bold ${source.badge}`}>
                                                {source.label}
                                            </span>
                                            <span className="text-xs font-medium text-gray-500">{job.importedLabel}</span>
                                            <span className={`text-xs font-bold ${matchColor(job.match)}`}>{job.match}%</span>
                                            <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[job.status]}`}>
                                                {job.status}
                                            </span>
                                        </div>
                                    );
                                })}
                                {sorted.length === 0 && (
                                    <div className="px-6 py-10 text-center text-xs font-medium text-gray-400">
                                        No imported jobs from this source yet.
                                    </div>
                                )}
                            </div>
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-2.5 border-t border-gray-100 bg-gray-50 px-6 py-3">
                                    <span className="text-brand">☑</span>
                                    <span className="text-xs font-semibold text-ink">{selectedIds.length} selected</span>
                                    <div className="ml-auto flex gap-2">
                                        <SecondaryButton onClick={archiveSelected}>Archive</SecondaryButton>
                                        <PrimaryButton type="button" onClick={stub('tailoring resumes in bulk')}>
                                            Tailor resume to selected
                                        </PrimaryButton>
                                    </div>
                                </div>
                            )}
                        </div>

                        <aside className="flex w-[380px] flex-none flex-col gap-4 overflow-y-auto p-6">
                            {selectedJob ? (
                                <>
                                    <div>
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <div className="text-base font-bold text-ink">{selectedJob.title}</div>
                                                <div className="mt-1 text-xs font-semibold text-gray-500">
                                                    {selectedJob.company} · {selectedJob.location}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setOpenJobId(null)}
                                                className="text-gray-400"
                                                aria-label="Close job detail"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10.5px] font-bold text-brand-accent">
                                                {selectedJob.salary}
                                            </span>
                                            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10.5px] font-bold text-brand-accent">
                                                {selectedJob.posted}
                                            </span>
                                            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10.5px] font-bold text-brand-accent">
                                                {selectedJob.applicants} applicants
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 p-4 text-center">
                                        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Match against your resume
                                        </div>
                                        <div className="text-3xl font-extrabold text-brand">{selectedJob.match}%</div>
                                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-brand"
                                                style={{ width: `${selectedJob.match}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Import details
                                        </div>
                                        <div className="flex flex-col gap-2 text-xs font-medium text-ink">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Source</span>
                                                <span>{SOURCE_META[selectedJob.source].label}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Imported via</span>
                                                <span>Browser extension</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Imported</span>
                                                <span>{selectedJob.importedLabel}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Original URL</span>
                                                <span className="text-brand">{selectedJob.urlLabel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Skills matched
                                        </div>
                                        {selectedJob.matched.map((skill) => (
                                            <div key={skill} className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink">
                                                <span className="font-extrabold text-green-600">✓</span>
                                                {skill}
                                            </div>
                                        ))}
                                    </div>

                                    {selectedJob.missing.length > 0 && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                                            <div className="mb-1.5 text-xs font-semibold text-red-600">
                                                {selectedJob.missing.length} gap(s) found
                                            </div>
                                            {selectedJob.missing.map((gap) => (
                                                <div key={gap} className="mb-0.5 text-[11.5px] text-gray-500">
                                                    No mention of &ldquo;{gap}&rdquo; in your resume.
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div>
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Requirements
                                        </div>
                                        <ul className="list-disc space-y-1 pl-4 text-xs text-ink">
                                            {selectedJob.requirements.map((req) => (
                                                <li key={req}>{req}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <PrimaryButton
                                        type="button"
                                        className="w-full justify-center"
                                        onClick={stub('resume tailoring')}
                                    >
                                        Tailor resume to this job
                                    </PrimaryButton>
                                    <SecondaryButton
                                        type="button"
                                        className="w-full justify-center"
                                        onClick={stub('cover letter drafting')}
                                    >
                                        Draft cover letter
                                    </SecondaryButton>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center px-6 text-center text-xs font-medium text-gray-400">
                                    Select a job from the list to see its original posting and match details.
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
