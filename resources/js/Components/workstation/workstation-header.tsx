import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CheckIcon,
    ChevronDownIcon,
    DocumentDuplicateIcon,
    EllipsisVerticalIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/Components/ui/badge';
import { buttonClassName } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import type { ContactErrors } from '@/hooks/use-valid-contact';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/types';

const TABS = ['Guide', 'Edit', 'Optimize', 'Review'] as const;

export function WorkstationHeader({
    resumeId,
    title,
    onTitleChange,
    saveStatus,
    showSaved,
    contactErrors,
    onFixContact,
}: {
    resumeId: number;
    title: string;
    onTitleChange: (title: string) => void;
    saveStatus: SaveStatus;
    showSaved: boolean;
    contactErrors: ContactErrors;
    onFixContact: () => void;
}) {
    const [renaming, setRenaming] = useState(false);
    const [duplicating, setDuplicating] = useState(false);

    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold">{title || 'Untitled resume'}</span>
                    {showSaved && saveStatus === 'saved' && (
                        <Badge
                            variant="outline"
                            className="border-transparent bg-emerald-50 text-emerald-600"
                        >
                            <CheckIcon className="size-3" />
                            Saved
                        </Badge>
                    )}
                    {(contactErrors.email !== null || contactErrors.phone !== null) && (
                        <button
                            type="button"
                            onClick={onFixContact}
                            className="inline-flex items-center gap-1 rounded-full border border-transparent bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 hover:underline"
                        >
                            <ExclamationTriangleIcon className="size-3" />
                            {contactErrors.email !== null && contactErrors.phone !== null
                                ? 'Email and phone not saving'
                                : contactErrors.email !== null
                                  ? 'Email not saving'
                                  : 'Phone not saving'}
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Menu as="div" className="relative">
                        <MenuButton
                            className={buttonClassName('outline', 'icon')}
                            aria-label="More actions"
                        >
                            <EllipsisVerticalIcon className="size-4" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                        >
                            {renaming ? (
                                <div className="px-2 py-1.5">
                                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Rename
                                    </p>
                                    <Input
                                        autoFocus
                                        defaultValue={title}
                                        onKeyDown={(event) => {
                                            event.stopPropagation();

                                            if (event.key === 'Enter') {
                                                event.currentTarget.blur();
                                            }
                                        }}
                                        onBlur={(event) => {
                                            onTitleChange(event.currentTarget.value);
                                            setRenaming(false);
                                        }}
                                    />
                                </div>
                            ) : (
                                <MenuItem>
                                    <button
                                        type="button"
                                        onClick={() => setRenaming(true)}
                                        className="w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                    >
                                        Rename
                                    </button>
                                </MenuItem>
                            )}
                            <div className="my-1 border-t border-gray-200" />
                            <MenuItem>
                                <button
                                    type="button"
                                    disabled={duplicating}
                                    onClick={() => {
                                        setDuplicating(true);
                                        router.post(
                                            route('resumes.duplicate', resumeId),
                                            undefined,
                                            { onFinish: () => setDuplicating(false) },
                                        );
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100 disabled:opacity-50"
                                >
                                    {duplicating ? (
                                        <ArrowPathIcon className="size-4 animate-spin" />
                                    ) : (
                                        <DocumentDuplicateIcon className="size-4" />
                                    )}
                                    Duplicate
                                </button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>

                    <Menu as="div" className="relative">
                        <MenuButton
                            className={buttonClassName('default', 'default', 'w-full sm:w-auto')}
                        >
                            <ArrowDownTrayIcon className="size-4" />
                            Download
                            <ChevronDownIcon className="size-3.5" />
                        </MenuButton>
                        <MenuItems
                            anchor="bottom end"
                            className="z-50 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                        >
                            <MenuItem>
                                <a
                                    href={route('resumes.download', resumeId)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download PDF
                                </a>
                            </MenuItem>
                            <MenuItem>
                                <a
                                    href={route('resumes.download-docx', resumeId)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm data-focus:bg-gray-100"
                                >
                                    Download DOCX
                                </a>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-200 px-3">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        disabled={tab !== 'Edit'}
                        className={cn(
                            'border-b-2 py-2 text-sm',
                            tab === 'Edit'
                                ? 'border-indigo-600 font-medium text-indigo-600'
                                : 'border-transparent text-gray-500 disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
}
