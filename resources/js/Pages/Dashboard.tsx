import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowsRightLeftIcon,
    ChevronDownIcon,
    DocumentDuplicateIcon,
    EllipsisVerticalIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ScoreDial } from '@/Components/resume/score-dial';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import type { ResumeSummary } from '@/types';

function scoreDotColor(score: number): string {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-400';
    return 'bg-gray-300';
}

function ResumeCard({ resume }: { resume: ResumeSummary }) {
    const [expanded, setExpanded] = useState(false);
    const [creatingVersion, setCreatingVersion] = useState(false);
    const hasVersions = resume.versions.length > 1;

    function createVersion() {
        if (creatingVersion) return;

        router.post(route('resumes.duplicate', resume.id), undefined, {
            onStart: () => setCreatingVersion(true),
            onFinish: () => setCreatingVersion(false),
        });
    }

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
        <Card className="p-0">
            <div className="flex items-center gap-4 p-4">
                <ScoreDial score={resume.score} size={48} />
                <div className="min-w-0 flex-1">
                    <Link
                        href={route('resumes.workstation', resume.id)}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-brand"
                    >
                        {resume.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                        {resume.target_role || 'No target role set'}
                        {resume.updated_at && ` · Updated ${resume.updated_at}`}
                    </p>
                </div>
                <Menu as="div" className="relative">
                    <MenuButton className={buttonClassName('outline', 'sm')}>
                        Download
                        <ChevronDownIcon className="size-3.5" />
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                    >
                        <MenuItem>
                            <a
                                href={route('resumes.download', resume.id)}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                            >
                                Download PDF
                            </a>
                        </MenuItem>
                        <MenuItem>
                            <a
                                href={route('resumes.download-docx', resume.id)}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
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
                        className="p-1 text-gray-500 hover:text-gray-900"
                    >
                        <EllipsisVerticalIcon className="size-5" />
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                    >
                        <MenuItem>
                            <button
                                type="button"
                                disabled={creatingVersion}
                                onClick={createVersion}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100 disabled:opacity-50"
                            >
                                <DocumentDuplicateIcon className="size-4" />
                                {creatingVersion ? 'Creating…' : 'New version'}
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
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
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
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 data-focus:bg-red-50"
                                >
                                    <TrashIcon className="size-4" />
                                    Delete resume
                                </button>
                            </MenuItem>
                        )}
                        <div className="my-1 border-t border-gray-200" />
                        <div className="px-2 py-1.5">
                            <p className="mb-1 text-[10px] font-semibold text-gray-500 uppercase">
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
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            />
                        </div>
                    </MenuItems>
                </Menu>
            </div>

            {hasVersions && (
                <div className="border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full px-4 py-1.5 text-left text-xs font-medium text-gray-500 hover:text-gray-900"
                    >
                        {expanded ? 'Hide' : 'Show'} {resume.versions.length} versions
                    </button>
                    {expanded && (
                        <div className="flex flex-col pb-1.5">
                            {resume.versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="flex items-center gap-2.5 px-4 py-2 pl-10 hover:bg-gray-50"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            scoreDotColor(version.score),
                                        )}
                                    />
                                    <span className="flex-1 truncate text-[12px] font-semibold">
                                        {version.title}
                                        {version.target_company && (
                                            <span className="ml-1.5 font-normal text-gray-500">
                                                — {version.target_company}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
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
                                        className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <TrashIcon className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default function Dashboard({
    resumes,
    average_score,
    hasStarterProfile,
}: {
    resumes: ResumeSummary[];
    average_score: number | null;
    hasStarterProfile: boolean;
}) {
    const [creatingResume, setCreatingResume] = useState(false);

    function createResume() {
        if (creatingResume) return;

        router.post(
            route('resumes.store'),
            {},
            {
                onStart: () => setCreatingResume(true),
                onFinish: () => setCreatingResume(false),
            },
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <Card className="gap-6 p-6">
                        {!hasStarterProfile && (
                            <div className="flex flex-col gap-3 rounded-md border border-brand-subtle bg-brand-subtle/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold">
                                        Set up your starter profile
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Fill it in once and every new resume
                                        starts pre-filled.
                                    </p>
                                </div>
                                <Link
                                    href={route('starter-profile.edit')}
                                    className={cn(buttonClassName('outline'), 'shrink-0')}
                                >
                                    Set up profile
                                </Link>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.06em] text-gray-500 uppercase">
                                    Your resumes
                                </p>
                                {average_score !== null && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        Average score: {average_score}/100
                                    </p>
                                )}
                            </div>
                            <Button disabled={creatingResume} onClick={createResume}>
                                <PlusIcon className="size-4" />
                                {creatingResume ? 'Creating…' : 'New resume'}
                            </Button>
                        </div>

                        {resumes.length === 0 ? (
                            <p className="py-10 text-center text-sm text-gray-500">
                                You haven't created a resume yet.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {resumes.map((resume) => (
                                    <ResumeCard key={resume.id} resume={resume} />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
