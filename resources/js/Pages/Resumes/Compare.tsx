import { Head, Link, router } from '@inertiajs/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button, buttonClassName } from '@/Components/ui/button';
import { diffBullets, diffSummary } from '@/lib/resume-diff';
import type { DiffPart } from '@/lib/resume-diff';
import { sectionLabels } from '@/lib/resume-sections';
import { cn } from '@/lib/utils';

type Breakdown = { label: string; score: number }[];

type CompareExperience = {
    title: string;
    company: string;
    bullets: string[];
};

type CompareDocument = {
    full_name: string;
    headline: string;
    email: string;
    summary: string;
    experiences: CompareExperience[];
};

type CompareSide = {
    id: number;
    title: string;
    document: CompareDocument;
    breakdown: Breakdown;
};

type Props = {
    group: { id: number; title: string };
    versions: { id: number; title: string }[];
    left: CompareSide;
    right: CompareSide;
};

export default function ResumeCompare({ group, versions, left, right }: Props) {
    function swap(side: 'left' | 'right', id: number) {
        router.get(route('resume-groups.compare', group.id), {
            left: side === 'left' ? id : left.id,
            right: side === 'right' ? id : right.id,
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Compare — ${group.title}`} />

            <div className="flex min-h-[calc(100vh-4rem)]">
                <CompareSidebar
                    versions={versions}
                    left={left}
                    right={right}
                    onSelect={(id) => swap('right', id)}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[15px] font-bold">
                                {group.title}
                            </h1>
                            <VersionChip
                                value={left}
                                options={versions.filter(
                                    (version) => version.id !== right.id,
                                )}
                                onSwap={(id) => swap('left', id)}
                                tone="neutral"
                            />
                            <span className="text-[11px] text-gray-500">
                                vs
                            </span>
                            <VersionChip
                                value={right}
                                options={versions.filter(
                                    (version) => version.id !== left.id,
                                )}
                                onSwap={(id) => swap('right', id)}
                                tone="brand"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('dashboard')}
                                className={buttonClassName('outline', 'sm')}
                            >
                                Exit compare
                            </Link>
                            <Button
                                size="sm"
                                onClick={() =>
                                    router.post(route('resumes.duplicate', right.id))
                                }
                            >
                                Save as new version
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-2 text-[11px] text-gray-500">
                        <Legend swatch="bg-emerald-200" label="Added" />
                        <Legend swatch="bg-red-200" label="Removed" />
                        <Legend swatch="bg-yellow-200" label="Changed" />
                        <span className="ml-auto">
                            Comparing bullets by position — reordered roles
                            may not align.
                        </span>
                    </div>

                    <div className="flex-1 bg-surface p-6">
                        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
                            <CompareColumn
                                side={left}
                                label={left.title}
                                tone="neutral"
                            />
                            <CompareColumn
                                side={right}
                                other={left}
                                label={right.title}
                                tone="brand"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

/** A static list of the sections this diff engine covers, and every group
 * version as a clickable row that sets the comparison (right) side — a
 * second way to change it alongside the header's dropdown chips. */
function CompareSidebar({
    versions,
    left,
    right,
    onSelect,
}: {
    versions: { id: number; title: string }[];
    left: CompareSide;
    right: CompareSide;
    onSelect: (id: number) => void;
}) {
    return (
        <aside className="flex w-[200px] shrink-0 flex-col gap-5 border-r border-gray-200 bg-white p-4">
            <div>
                <p className="mb-2 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                    Sections
                </p>
                <div className="flex flex-col gap-0.5 text-xs font-semibold text-gray-900">
                    <span className="rounded-md px-2 py-1.5">
                        {sectionLabels.summary}
                    </span>
                    <span className="rounded-md px-2 py-1.5">
                        {sectionLabels.experience}
                    </span>
                </div>
            </div>

            <div>
                <p className="mb-2 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                    Versions
                </p>
                <div className="flex flex-col gap-1.5">
                    {versions.map((version) => (
                        <button
                            key={version.id}
                            type="button"
                            disabled={version.id === left.id}
                            onClick={() => onSelect(version.id)}
                            className={cn(
                                'rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                                version.id === right.id
                                    ? 'border-brand-subtle bg-brand-subtle text-brand'
                                    : 'border-gray-200 bg-transparent text-gray-900 hover:bg-gray-50',
                            )}
                        >
                            {version.title}
                        </button>
                    ))}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start gap-1.5 text-xs"
                    onClick={() => router.post(route('resumes.duplicate', right.id))}
                >
                    <PlusIcon className="size-3.5" /> New version
                </Button>
            </div>
        </aside>
    );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', swatch)} />
            {label}
        </span>
    );
}

function VersionChip({
    value,
    options,
    onSwap,
    tone,
}: {
    value: CompareSide;
    options: { id: number; title: string }[];
    onSwap: (id: number) => void;
    tone: 'neutral' | 'brand';
}) {
    return (
        <select
            value={value.id}
            onChange={(event) => onSwap(Number(event.target.value))}
            className={cn(
                'h-7 rounded-full border-0 px-3 text-[12px] font-semibold outline-none',
                tone === 'brand'
                    ? 'bg-brand-subtle text-brand'
                    : 'bg-gray-100 text-gray-500',
            )}
        >
            <option value={value.id}>{value.title}</option>
            {options
                .filter((version) => version.id !== value.id)
                .map((version) => (
                    <option key={version.id} value={version.id}>
                        {version.title}
                    </option>
                ))}
        </select>
    );
}

/** Only the changed words are shown highlighted; removed words are dropped
 * from the running text entirely — a struck-through word mid-sentence reads
 * worse than just showing the sentence as it now stands. */
function SummaryDiff({ parts }: { parts: DiffPart[] }) {
    return (
        <>
            {parts
                .filter((part) => !part.removed)
                .map((part, index) => (
                    <span
                        key={index}
                        className={cn(part.added && 'bg-yellow-200')}
                    >
                        {part.value}
                    </span>
                ))}
        </>
    );
}

function CompareColumn({
    side,
    other,
    label,
    tone,
}: {
    side: CompareSide;
    other?: CompareSide;
    label: string;
    tone: 'neutral' | 'brand';
}) {
    const summaryParts: DiffPart[] = other
        ? diffSummary(other.document.summary, side.document.summary)
        : [{ value: side.document.summary, added: false, removed: false }];

    return (
        <div>
            <p
                className={cn(
                    'mb-2 text-[10px] font-bold uppercase tracking-wide',
                    tone === 'brand' ? 'text-brand' : 'text-gray-500',
                )}
            >
                {label}
            </p>

            <div className="rounded-lg border border-surface-border bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="text-lg font-extrabold">
                    {side.document.full_name}
                </div>
                <div className="mb-3 text-[11px] text-gray-500">
                    {side.document.headline} · {side.document.email}
                </div>

                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">
                    Summary
                </p>
                <p className="mb-4 text-[12px] leading-relaxed">
                    <SummaryDiff parts={summaryParts} />
                </p>

                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">
                    Experience
                </p>
                <div className="space-y-3">
                    {side.document.experiences.map((experience, index) => {
                        const otherBullets =
                            other?.document.experiences[index]?.bullets ?? [];
                        const bulletParts: DiffPart[] = other
                            ? diffBullets(otherBullets, experience.bullets)
                            : experience.bullets.map((value) => ({
                                  value,
                                  added: false,
                                  removed: false,
                              }));

                        return (
                            <div key={index}>
                                <p className="text-[12.5px] font-bold">
                                    {experience.title}, {experience.company}
                                </p>
                                <ul className="mt-1 space-y-0.5 text-[12.5px]">
                                    {bulletParts.map((part, bulletIndex) => (
                                        <li
                                            key={bulletIndex}
                                            className={cn(
                                                'rounded px-1 py-0.5',
                                                part.added && 'bg-emerald-200',
                                                part.removed &&
                                                    'bg-red-200 line-through',
                                            )}
                                        >
                                            {part.value}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-gray-200 pt-3">
                    {side.breakdown.map((band) => (
                        <div key={band.label} className="space-y-1">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase">
                                {band.label}
                            </p>
                            <div className="h-1.5 rounded-full bg-gray-100">
                                <div
                                    className="h-full rounded-full bg-brand"
                                    style={{
                                        width: `${(band.score / 25) * 100}%`,
                                    }}
                                />
                            </div>
                            <p className="text-[11px] font-bold">
                                {band.score}/25
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
