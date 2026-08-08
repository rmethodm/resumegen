import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowsRightLeftIcon,
    ChevronDownIcon,
    ClipboardDocumentIcon,
    DocumentTextIcon,
    EllipsisVerticalIcon,
    EnvelopeIcon,
    LockClosedIcon,
    PlusIcon,
    ShareIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Head, Link, router } from '@inertiajs/react';
import { useState, type MouseEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { NewResumeModal } from '@/Components/dashboard/new-resume-modal';
import { ScoreDial } from '@/Components/resume/score-dial';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { ShareResumeModal } from '@/Components/workstation/share-resume-modal';
import { cn } from '@/lib/utils';
import type { DashboardShareInfo, ResumeSummary } from '@/types';

function scoreBand(score: number): 'good' | 'fair' | 'weak' {
    if (score >= 70) {
        return 'good';
    }
    if (score >= 40) {
        return 'fair';
    }
    return 'weak';
}

function scoreDotColor(score: number): string {
    const band = scoreBand(score);
    if (band === 'good') {
        return 'bg-emerald-500';
    }
    if (band === 'fair') {
        return 'bg-amber-400';
    }
    return 'bg-red-500';
}

function scoreSegmentColor(score: number): string {
    const band = scoreBand(score);
    if (band === 'good') {
        return 'bg-emerald-500';
    }
    if (band === 'fair') {
        return 'bg-amber-400';
    }
    return 'bg-red-500';
}

/**
 * Signature strip: every resume score as a segment of one readiness bar.
 * Encodes portfolio strength without generic KPI cards.
 */
function ReadinessStrip({
    resumes,
    averageScore,
}: {
    resumes: ResumeSummary[];
    averageScore: number | null;
}) {
    if (resumes.length === 0) {
        return null;
    }

    const good = resumes.filter((r) => scoreBand(r.score) === 'good').length;
    const needsWork = resumes.length - good;
    const shared = resumes.filter(
        (r) => r.share !== null && !r.share.is_expired,
    ).length;

    return (
        <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                        Portfolio readiness
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                        {averageScore !== null ? (
                            <>
                                <span className="text-3xl font-semibold tabular-nums tracking-tight text-text-primary">
                                    {averageScore}
                                </span>
                                <span className="text-sm text-text-tertiary">
                                    / 100 avg
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-text-secondary">
                                No scores yet
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs text-text-secondary">
                    <span className="tabular-nums font-medium text-text-primary">
                        {resumes.length}
                    </span>{' '}
                    {resumes.length === 1 ? 'resume' : 'resumes'}
                    {good > 0 && (
                        <>
                            {' · '}
                            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                {good}
                            </span>{' '}
                            ready
                        </>
                    )}
                    {needsWork > 0 && (
                        <>
                            {' · '}
                            <span className="tabular-nums text-amber-600 dark:text-amber-400">
                                {needsWork}
                            </span>{' '}
                            need work
                        </>
                    )}
                    {shared > 0 && (
                        <>
                            {' · '}
                            <span className="tabular-nums text-text-primary">{shared}</span>{' '}
                            shared
                        </>
                    )}
                </p>
            </div>

            <div
                className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-sunken"
                role="img"
                aria-label={`Score spectrum across ${resumes.length} resumes`}
            >
                {[...resumes]
                    .sort((a, b) => b.score - a.score)
                    .map((resume) => (
                        <div
                            key={resume.id}
                            title={`${resume.title}: ${resume.score}/100`}
                            className={cn(
                                'min-w-[6px] flex-1 first:rounded-l-full last:rounded-r-full',
                                scoreSegmentColor(resume.score),
                            )}
                            style={{ flexGrow: Math.max(resume.score, 8) }}
                        />
                    ))}
            </div>
            <p className="mt-2 text-[11px] text-text-tertiary">
                Each segment is one resume, ordered by score. Green ≥ 70 · Amber
                40–69 · Red under 40.
            </p>
        </div>
    );
}

function ShareStatus({
    share,
    compact = false,
    onOpenShare,
}: {
    share: DashboardShareInfo | null;
    compact?: boolean;
    onOpenShare: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    if (!share) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 text-text-tertiary',
                    compact ? 'text-[10px]' : 'text-[11px]',
                )}
            >
                <ShareIcon className={compact ? 'size-3' : 'size-3.5'} />
                Not shared
            </span>
        );
    }

    function copyLink(event: MouseEvent) {
        event.stopPropagation();
        navigator.clipboard
            .writeText(share!.url)
            .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => {
                setCopyFailed(true);
                window.setTimeout(() => setCopyFailed(false), 1500);
            });
    }

    if (share.is_expired) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400',
                    compact ? 'text-[10px]' : 'text-[11px]',
                )}
            >
                <ShareIcon className={compact ? 'size-3' : 'size-3.5'} />
                <button
                    type="button"
                    onClick={onOpenShare}
                    className="font-medium underline-offset-2 hover:underline"
                >
                    Link expired
                </button>
                {share.expires_at && !compact && (
                    <span className="font-normal text-amber-600 dark:text-amber-500">
                        · {share.expires_at}
                    </span>
                )}
            </span>
        );
    }

    const viewsLabel =
        share.view_count === 0
            ? 'No views yet'
            : `${share.view_count} view${share.view_count === 1 ? '' : 's'}`;

    return (
        <span
            className={cn(
                'inline-flex min-w-0 items-center gap-1.5 text-text-secondary',
                compact ? 'text-[10px]' : 'text-[11px]',
            )}
        >
            <ShareIcon
                className={cn(
                    'shrink-0 text-accent-bg',
                    compact ? 'size-3' : 'size-3.5',
                )}
            />
            <button
                type="button"
                onClick={onOpenShare}
                className="truncate font-medium text-text-secondary underline-offset-2 hover:text-accent-text hover:underline"
            >
                Shared
            </button>
            <span className="truncate text-text-tertiary">· {viewsLabel}</span>
            {share.require_password && (
                <LockClosedIcon
                    className={cn(
                        'shrink-0 text-text-tertiary',
                        compact ? 'size-3' : 'size-3.5',
                    )}
                    title="Password protected"
                    aria-label="Password protected"
                />
            )}
            {share.require_email && (
                <EnvelopeIcon
                    className={cn(
                        'shrink-0 text-text-tertiary',
                        compact ? 'size-3' : 'size-3.5',
                    )}
                    title="Email required"
                    aria-label="Email required"
                />
            )}
            <button
                type="button"
                onClick={copyLink}
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 font-medium text-accent-text hover:bg-surface-sunken"
                title="Copy share link"
            >
                <ClipboardDocumentIcon className={compact ? 'size-3' : 'size-3.5'} />
                {copyFailed ? 'Copy failed' : copied ? 'Copied' : 'Copy'}
            </button>
        </span>
    );
}

function ResumeCard({ resume }: { resume: ResumeSummary }) {
    const [expanded, setExpanded] = useState(false);
    // Store only the resume id so the modal re-reads share from props after
    // Inertia reloads the dashboard (toggles, password rotate, cancel share).
    const [shareModalResumeId, setShareModalResumeId] = useState<number | null>(null);
    const shareModalShare: DashboardShareInfo | null =
        shareModalResumeId === null
            ? null
            : shareModalResumeId === resume.id
              ? resume.share
              : (resume.versions.find((version) => version.id === shareModalResumeId)?.share ??
                null);
    const hasVersions = resume.versions.length > 1;
    const alreadyShared = resume.share !== null;

    function deleteGroup() {
        router.delete(route('resume-groups.destroy', resume.group_id), {
            preserveScroll: true,
        });
    }

    function deleteVersion(versionId: number) {
        router.delete(route('resumes.destroy', versionId), {
            preserveScroll: true,
        });
    }

    function renameGroup(title: string) {
        const trimmed = title.trim();

        if (trimmed !== '' && trimmed !== resume.title) {
            router.patch(
                route('resume-groups.update', resume.group_id),
                { title: trimmed },
                { preserveScroll: true, preserveState: true },
            );
        }
    }

    return (
        <Card className="gap-0 overflow-hidden p-0 shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                    <ScoreDial score={resume.score} size={52} />
                    <div className="min-w-0 flex-1">
                        <div className="flex gap-2.5">
                            <span
                                className="mt-1 w-0.5 shrink-0 self-stretch rounded-full bg-accent-bg"
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <Link
                                    href={route('resumes.workstation', resume.id)}
                                    className="block truncate text-sm font-semibold tracking-tight text-text-primary hover:text-accent-text"
                                >
                                    {resume.title}
                                </Link>
                                <p className="mt-0.5 truncate text-xs text-text-secondary">
                                    {resume.target_role || 'No target role set'}
                                    {resume.updated_at && ` · Updated ${resume.updated_at}`}
                                </p>
                                <div className="mt-1.5">
                                    <ShareStatus
                                        share={resume.share}
                                        onOpenShare={() => setShareModalResumeId(resume.id)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
                    <Menu as="div" className="relative hidden sm:block">
                        <MenuButton className={buttonClassName('outline', 'sm')}>
                            Download
                            <ChevronDownIcon className="size-3.5" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-dropdown w-44 rounded-md border border-border-subtle bg-surface-card p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            <MenuItem>
                                <a
                                    href={route('resumes.download', resume.id)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised"
                                >
                                    Download PDF
                                </a>
                            </MenuItem>
                            <MenuItem>
                                <a
                                    href={route('resumes.download-docx', resume.id)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised"
                                >
                                    Download DOCX
                                </a>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                    <Link
                        href={route('resumes.workstation', resume.id)}
                        className={buttonClassName('default', 'sm')}
                    >
                        Open
                    </Link>
                    <Menu as="div" className="relative">
                        <MenuButton
                            aria-label={`Actions for ${resume.title}`}
                            className="rounded-md p-1 text-text-secondary transition-colors duration-150 hover:bg-surface-raised hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            <EllipsisVerticalIcon className="size-5" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-dropdown w-56 rounded-md border border-border-subtle bg-surface-card p-1 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            <MenuItem>
                                <a
                                    href={route('resumes.download', resume.id)}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised sm:hidden"
                                >
                                    Download PDF
                                </a>
                            </MenuItem>
                            <MenuItem>
                                <a
                                    href={route('resumes.download-docx', resume.id)}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised sm:hidden"
                                >
                                    Download DOCX
                                </a>
                            </MenuItem>
                            <MenuItem>
                                <button
                                    type="button"
                                    disabled={alreadyShared}
                                    onClick={() => setShareModalResumeId(resume.id)}
                                    title={
                                        alreadyShared
                                            ? 'This resume already has a share link'
                                            : 'Create a share link'
                                    }
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 data-focus:disabled:bg-transparent"
                                >
                                    <ShareIcon className="size-4" />
                                    Share
                                </button>
                            </MenuItem>
                            {hasVersions && (
                                <MenuItem>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.get(
                                                route('resume-groups.compare', resume.group_id),
                                            )
                                        }
                                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface-raised"
                                    >
                                        <ArrowsRightLeftIcon className="size-4" />
                                        Compare versions
                                    </button>
                                </MenuItem>
                            )}
                            {!hasVersions && (
                                <MenuItem>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const onConfirm = deleteGroup;
                                            if (
                                                !window.confirm(
                                                    `Delete "${resume.title}"? This can't be undone.`,
                                                )
                                            ) {
                                                return;
                                            }
                                            onConfirm();
                                        }}
                                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-error-text data-focus:bg-error-bg"
                                    >
                                        <TrashIcon className="size-4" />
                                        Delete resume
                                    </button>
                                </MenuItem>
                            )}
                            <div className="my-1 border-t border-border-subtle" />
                            <div className="px-2 py-1.5">
                                <p className="mb-1 text-[11px] font-medium text-text-tertiary">
                                    Rename
                                </p>
                                <input
                                    aria-label="Resume name"
                                    defaultValue={resume.title}
                                    maxLength={255}
                                    onBlur={(event) => renameGroup(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.currentTarget.blur();
                                        }
                                    }}
                                    className="w-full rounded-md border border-border-default bg-surface-canvas px-2 py-1 text-xs text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30"
                                />
                            </div>
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            {hasVersions && (
                <div className="border-t border-border-subtle bg-surface-raised/40">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus:outline-none focus-visible:bg-surface-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
                    >
                        {expanded ? 'Hide' : 'Show'} {resume.versions.length} versions
                    </button>
                    {expanded && (
                        <div className="flex flex-col pb-1.5">
                            {resume.versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="flex items-center gap-2.5 px-4 py-2 pl-10 transition-colors duration-150 hover:bg-surface-raised"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            scoreDotColor(version.score),
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="block truncate text-[12px] font-semibold text-text-primary">
                                            {version.title}
                                            {version.target_company && (
                                                <span className="ml-1.5 font-normal text-text-tertiary">
                                                    — {version.target_company}
                                                </span>
                                            )}
                                        </span>
                                        <div className="mt-0.5">
                                            <ShareStatus
                                                share={version.share}
                                                compact
                                                onOpenShare={() =>
                                                    setShareModalResumeId(version.id)
                                                }
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[11px] tabular-nums text-text-tertiary">
                                        {version.score}/100
                                    </span>
                                    <Link
                                        href={route('resumes.workstation', version.id)}
                                        className={buttonClassName('outline', 'sm')}
                                    >
                                        Open
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={version.is_base}
                                        onClick={() => {
                                            const onConfirm = () =>
                                                deleteVersion(version.id);
                                            if (
                                                !window.confirm(
                                                    `Delete "${version.title}"? This can't be undone.`,
                                                )
                                            ) {
                                                return;
                                            }
                                            onConfirm();
                                        }}
                                        aria-label={`Delete ${version.title}`}
                                        className="rounded-md p-1 text-text-tertiary transition-colors duration-150 hover:text-error-text focus:outline-none focus-visible:text-error-text focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <TrashIcon className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <ShareResumeModal
                open={shareModalResumeId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setShareModalResumeId(null);
                    }
                }}
                resumeId={shareModalResumeId ?? resume.id}
                share={shareModalShare}
            />
        </Card>
    );
}

export default function Dashboard({
    resumes,
    average_score,
    hasStarterProfile,
    roleSamples = [],
}: {
    resumes: ResumeSummary[];
    average_score: number | null;
    hasStarterProfile: boolean;
    roleSamples?: {
        id: string;
        label: string;
        description: string;
        target_role: string;
    }[];
}) {
    const [newResumeOpen, setNewResumeOpen] = useState(false);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {/* Page title row */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                                Workspace
                            </p>
                            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
                                Your resumes
                            </h1>
                        </div>
                        <Button onClick={() => setNewResumeOpen(true)}>
                            <PlusIcon className="size-4" />
                            New resume
                        </Button>
                    </div>

                    <ReadinessStrip resumes={resumes} averageScore={average_score} />

                    {!hasStarterProfile && (
                        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-3">
                                <span
                                    className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full bg-accent-bg"
                                    aria-hidden
                                />
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">
                                        Set up your starter profile
                                    </p>
                                    <p className="mt-1 text-sm text-text-secondary">
                                        Fill it in once and every new resume starts
                                        pre-filled.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={route('starter-profile.edit')}
                                className={cn(buttonClassName('outline'), 'shrink-0')}
                            >
                                Set up profile
                            </Link>
                        </div>
                    )}

                    {resumes.length === 0 ? (
                        <div className="flex flex-col items-center rounded-lg border border-dashed border-border-default bg-surface-card px-6 py-14 text-center shadow-sm">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-text">
                                <DocumentTextIcon className="size-6" aria-hidden />
                            </span>
                            <p className="mt-4 text-sm font-semibold text-text-primary">
                                No resumes yet
                            </p>
                            <p className="mt-1 max-w-sm text-sm text-text-secondary">
                                Create one to start scoring, tailoring, and exporting.
                                Scores update as you edit.
                            </p>
                            <Button
                                className="mt-5"
                                onClick={() => setNewResumeOpen(true)}
                            >
                                <PlusIcon className="size-4" />
                                New resume
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {resumes.map((resume) => (
                                <ResumeCard key={resume.id} resume={resume} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <NewResumeModal
                open={newResumeOpen}
                onClose={() => setNewResumeOpen(false)}
                roleSamples={roleSamples}
            />
        </AuthenticatedLayout>
    );
}
