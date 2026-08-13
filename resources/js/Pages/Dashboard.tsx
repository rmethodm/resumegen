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
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Deferred, Head, Link, router } from '@inertiajs/react';
import { useEffect, useState, type MouseEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { NewResumeModal } from '@/Components/dashboard/new-resume-modal';
import { ScoreDial } from '@/Components/resume/score-dial';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { ShareResumeModal } from '@/Components/workstation/share-resume-modal';
import { scoreDotClass } from '@/lib/score-band';
import { cn } from '@/lib/utils';
import type { DashboardShareBadge, ResumeShareLink, ResumeSummary } from '@/types';

function ShareStatus({
    share,
    compact = false,
    onOpenShare,
}: {
    share: DashboardShareBadge | null;
    compact?: boolean;
    onOpenShare: () => void;
}) {
    const [copied, setCopied] = useState(false);

    if (!share) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 text-ink-faint',
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
            .catch(() => undefined);
    }

    if (share.is_expired) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 font-medium text-warning-text',
                    compact ? 'text-[10px]' : 'text-[11px]',
                )}
            >
                <ShareIcon className={compact ? 'size-3' : 'size-3.5'} />
                <button
                    type="button"
                    onClick={onOpenShare}
                    className="font-medium text-warning-text underline-offset-2 hover:underline"
                >
                    Link expired
                </button>
                {share.expires_at && !compact && (
                    <span className="font-normal text-warning">· {share.expires_at}</span>
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
                'inline-flex min-w-0 items-center gap-1.5 text-ink-muted',
                compact ? 'text-[10px]' : 'text-[11px]',
            )}
        >
            <ShareIcon className={cn('shrink-0 text-brand', compact ? 'size-3' : 'size-3.5')} />
            <button
                type="button"
                onClick={onOpenShare}
                className="truncate font-medium text-ink underline-offset-2 hover:text-brand hover:underline"
            >
                Shared
            </button>
            <span className="truncate text-ink-muted">· {viewsLabel}</span>
            {share.require_password && (
                <LockClosedIcon
                    className={cn('shrink-0 text-ink-faint', compact ? 'size-3' : 'size-3.5')}
                    title="Password protected"
                    aria-label="Password protected"
                />
            )}
            {share.require_email && (
                <EnvelopeIcon
                    className={cn('shrink-0 text-ink-faint', compact ? 'size-3' : 'size-3.5')}
                    title="Email required"
                    aria-label="Email required"
                />
            )}
            <button
                type="button"
                onClick={copyLink}
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 font-medium text-brand hover:bg-brand/5"
                title="Copy share link"
            >
                <ClipboardDocumentIcon className={compact ? 'size-3' : 'size-3.5'} />
                {copied ? 'Copied' : 'Copy'}
            </button>
        </span>
    );
}

function ResumeCard({
    resume,
    compact = false,
    onOpenShare,
}: {
    resume: ResumeSummary;
    /** Denser row for secondary list items after the first. */
    compact?: boolean;
    onOpenShare: (resumeId: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const hasVersions = resume.versions.length > 1;
    const alreadyShared = resume.share !== null;

    function deleteGroup() {
        if (!confirm(`Delete "${resume.title}"? This can't be undone.`)) {
            return;
        }

        router.delete(route('resume-groups.destroy', resume.group_id), {
            preserveScroll: true,
        });
    }

    function deleteVersion(versionId: number, title: string) {
        if (!confirm(`Delete "${title}"? This can't be undone.`)) {
            return;
        }

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
        <Shell innerClassName="overflow-hidden">
            <div
                className={cn(
                    'flex items-center gap-3 sm:gap-4',
                    compact ? 'px-3.5 py-3' : 'p-4',
                )}
            >
                <ScoreDial score={resume.score} size={compact ? 40 : 48} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Link
                            href={route('resumes.workstation', resume.id)}
                            className={cn(
                                'truncate font-semibold text-ink hover:text-brand',
                                compact ? 'text-[13px]' : 'text-sm',
                            )}
                        >
                            {resume.title}
                        </Link>
                        {resume.share !== null && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    resume.share.is_expired
                                        ? 'bg-warning-subtle text-warning-text'
                                        : 'bg-brand-subtle text-brand',
                                )}
                            >
                                {resume.share.is_expired ? 'Expired link' : 'Shared'}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {resume.target_role || 'No target role set'}
                        {resume.updated_at && ` · Updated ${resume.updated_at}`}
                    </p>
                    {!compact && (
                        <div className="mt-1">
                            <ShareStatus
                                share={resume.share}
                                onOpenShare={() => onOpenShare(resume.id)}
                            />
                        </div>
                    )}
                    {compact && resume.share !== null && (
                        <div className="mt-0.5">
                            <ShareStatus
                                share={resume.share}
                                compact
                                onOpenShare={() => onOpenShare(resume.id)}
                            />
                        </div>
                    )}
                </div>
                <Menu as="div" className={cn('relative', compact && 'hidden sm:block')}>
                    <MenuButton className={buttonClassName('outline', 'sm')}>
                        Download
                        <ChevronDownIcon className="size-3.5" />
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 w-44 rounded-md border border-surface-border bg-white p-1 shadow-lg focus:outline-none"
                    >
                        <MenuItem>
                            <a
                                href={route('resumes.download', resume.id)}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface"
                            >
                                Download PDF
                            </a>
                        </MenuItem>
                        <MenuItem>
                            <a
                                href={route('resumes.download-docx', resume.id)}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface"
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
                        className="p-1 text-ink-muted hover:text-ink"
                    >
                        <EllipsisVerticalIcon className="size-5" />
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 w-56 rounded-md border border-surface-border bg-white p-1 shadow-lg focus:outline-none"
                    >
                        <MenuItem>
                            <button
                                type="button"
                                disabled={alreadyShared}
                                onClick={() => onOpenShare(resume.id)}
                                title={
                                    alreadyShared
                                        ? 'This resume already has a share link'
                                        : 'Create a share link'
                                }
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface disabled:cursor-not-allowed disabled:opacity-40 data-focus:disabled:bg-transparent"
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
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-surface"
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
                                    onClick={deleteGroup}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger data-focus:bg-danger-subtle"
                                >
                                    <TrashIcon className="size-4" />
                                    Delete resume
                                </button>
                            </MenuItem>
                        )}
                        <div className="my-1 border-t border-surface-border" />
                        <div className="px-2 py-1.5">
                            <p className="mb-1 text-[10px] font-semibold text-ink-muted uppercase">
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
                                className="w-full rounded border border-surface-border px-2 py-1 text-xs"
                            />
                        </div>
                    </MenuItems>
                </Menu>
            </div>

            {hasVersions && (
                <div className="border-t border-surface-border/80">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full px-4 py-1.5 text-left text-xs font-medium text-ink-muted hover:text-ink"
                    >
                        {expanded ? 'Hide' : 'Show'} {resume.versions.length} versions
                    </button>
                    {expanded && (
                        <div className="flex flex-col pb-1.5">
                            {resume.versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="flex items-center gap-2.5 px-4 py-2 pl-10 hover:bg-surface/60"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            scoreDotClass(version.score),
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="block truncate text-[12px] font-semibold">
                                            {version.title}
                                            {version.target_company && (
                                                <span className="ml-1.5 font-normal text-ink-muted">
                                                    — {version.target_company}
                                                </span>
                                            )}
                                        </span>
                                        <div className="mt-0.5">
                                            <ShareStatus
                                                share={version.share}
                                                compact
                                                onOpenShare={() =>
                                                    onOpenShare(version.id)
                                                }
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-ink-muted">
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
                                        onClick={() => deleteVersion(version.id, version.title)}
                                        aria-label={`Delete ${version.title}`}
                                        className="text-ink-faint hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <TrashIcon className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </Shell>
    );
}

function ResumeCardSkeleton() {
    return (
        <Shell innerClassName="overflow-hidden">
            <div className="flex animate-pulse items-center gap-4 p-4">
                <div className="size-12 shrink-0 rounded-full bg-surface" />
                <div className="min-w-0 flex-1">
                    <div className="h-3.5 w-1/3 rounded bg-surface" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-surface/80" />
                </div>
                <div className="hidden h-8 w-16 rounded-md bg-surface sm:block" />
                <div className="hidden h-8 w-14 rounded-md bg-surface sm:block" />
            </div>
        </Shell>
    );
}

function EmptyResumes({ onCreate }: { onCreate: () => void }) {
    return (
        <Shell innerClassName="px-6 py-12 text-center sm:px-10">
            <span className="inline-flex items-center rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                Get started
            </span>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">
                Your first resume starts here
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                Create a blank resume from your starter profile, pick a role sample, or paste what you already have.
            </p>
            <Button
                type="button"
                onClick={onCreate}
                className="group mt-6 rounded-full px-5"
            >
                New resume
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-soft ease-soft group-hover:scale-105 group-active:scale-95">
                    <PlusIcon className="size-3.5" />
                </span>
            </Button>
        </Shell>
    );
}

export default function Dashboard({
    resumes,
    hasStarterProfile,
    roleSamples = [],
}: {
    resumes: ResumeSummary[] | undefined;
    hasStarterProfile: boolean;
    roleSamples?: {
        id: string;
        label: string;
        description: string;
        target_role: string;
    }[];
}) {
    const [newResumeOpen, setNewResumeOpen] = useState(false);
    // Share-modal state lives at page level, NOT inside ResumeCard: `resumes`
    // is a deferred prop, so every Inertia reload (each toggle in the modal
    // patches and reloads props) swaps the card list for skeletons and back,
    // unmounting the cards. A modal inside a card would close on every change.
    const [shareModalResumeId, setShareModalResumeId] = useState<number | null>(null);
    const [shareModalDetail, setShareModalDetail] = useState<ResumeShareLink | null>(null);
    const [shareModalReady, setShareModalReady] = useState(false);

    useEffect(() => {
        if (shareModalResumeId === null) {
            setShareModalDetail(null);
            setShareModalReady(false);

            return;
        }

        // `shareModalReady` stays true across refetches — dropping it would
        // unmount the open modal. Refetches update the detail in place.
        let cancelled = false;

        fetch(route('resumes.share.show', shareModalResumeId), {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load share');
                }

                return response.json() as Promise<{ share: ResumeShareLink | null }>;
            })
            .then((data) => {
                if (!cancelled) {
                    setShareModalDetail(data.share);
                    setShareModalReady(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    // Keep any previously loaded detail — nulling it while the
                    // modal is open would make it POST a brand-new share link.
                    setShareModalReady(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [shareModalResumeId, resumes]);

    const averageScore =
        resumes && resumes.length > 0
            ? Math.round(resumes.reduce((sum, row) => sum + row.score, 0) / resumes.length)
            : null;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-ink">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5">
                        {/* Bento header: score snapshot + quick start */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                            <Shell className="md:col-span-3" innerClassName="flex items-center gap-4 p-5 sm:p-6">
                                <ScoreDial score={averageScore} size={64} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                                        Overview
                                    </p>
                                    <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">
                                        {resumes === undefined
                                            ? 'Loading your resumes…'
                                            : resumes.length === 0
                                              ? 'No resumes yet'
                                              : `${resumes.length} resume${resumes.length === 1 ? '' : 's'}`}
                                    </h2>
                                    <p className="mt-1 text-sm text-ink-muted">
                                        {averageScore !== null
                                            ? `Average strength score ${averageScore}/100`
                                            : resumes === undefined
                                              ? 'Scores load with your list.'
                                              : 'Create a resume to see your average score.'}
                                    </p>
                                </div>
                            </Shell>

                            <Shell className="md:col-span-2" innerClassName="flex flex-col gap-2 p-4 sm:p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                                    Quick start
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => setNewResumeOpen(true)}
                                    className="group w-full justify-between rounded-full"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <DocumentTextIcon className="size-4" />
                                        New resume
                                    </span>
                                    <span className="flex size-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-soft ease-soft group-hover:scale-105">
                                        <PlusIcon className="size-3.5" />
                                    </span>
                                </Button>
                                <Link
                                    href={route('starter-profile.edit')}
                                    className={cn(
                                        buttonClassName('outline'),
                                        'w-full justify-between rounded-full',
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <UserCircleIcon className="size-4" />
                                        {hasStarterProfile ? 'Edit starter profile' : 'Set up starter profile'}
                                    </span>
                                    <span className="text-ink-faint">→</span>
                                </Link>
                            </Shell>
                        </div>

                        {!hasStarterProfile && (
                            <Shell innerClassName="border-l-4 border-l-brand p-4 sm:px-5">
                                <p className="text-sm font-bold text-ink">
                                    Tip: fill your starter profile once
                                </p>
                                <p className="mt-1 text-sm text-ink-muted">
                                    Every new resume can pre-fill from it — contact, summary, and more.
                                </p>
                            </Shell>
                        )}

                        <div className="flex items-end justify-between gap-4">
                            <p className="text-[10px] font-bold tracking-[0.12em] text-ink-faint uppercase">
                                Your resumes
                            </p>
                        </div>

                        <Deferred
                            data="resumes"
                            fallback={
                                <div className="flex flex-col gap-3">
                                    <ResumeCardSkeleton />
                                    <ResumeCardSkeleton />
                                    <ResumeCardSkeleton />
                                </div>
                            }
                        >
                            {resumes && resumes.length === 0 ? (
                                <EmptyResumes onCreate={() => setNewResumeOpen(true)} />
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {resumes?.map((resume, index) => (
                                        <ResumeCard
                                            key={resume.id}
                                            resume={resume}
                                            compact={index > 0}
                                            onOpenShare={() => setShareModalResumeId(resume.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </Deferred>
                    </div>
                </div>
            </div>

            <NewResumeModal
                open={newResumeOpen}
                onClose={() => setNewResumeOpen(false)}
                roleSamples={roleSamples}
            />

            {shareModalReady && shareModalResumeId !== null && (
                <ShareResumeModal
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setShareModalResumeId(null);
                        }
                    }}
                    resumeId={shareModalResumeId}
                    share={shareModalDetail}
                />
            )}
        </AuthenticatedLayout>
    );
}
