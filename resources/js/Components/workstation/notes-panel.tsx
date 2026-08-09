import { router } from '@inertiajs/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';

export type WorkstationNote = {
    id: number;
    body: string;
    x: number;
    y: number;
    width: number;
    height: number;
    created_at: string;
};

/** Simple list notes for the workstation (C12). Canvas positions stored but not free-drag yet. */
export function NotesPanel({
    resumeId,
    notes,
}: {
    resumeId: number;
    notes: WorkstationNote[];
}) {
    const [draftBody, setDraftBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onError = () => setError('Something went wrong. Try again.');

    function addNote() {
        setBusy(true);
        setError(null);
        router.post(
            route('resume-notes.store', resumeId),
            {
                body: draftBody,
                x: 24,
                y: 24 + notes.length * 12,
                width: 240,
                height: 140,
            },
            {
                preserveScroll: true,
                onSuccess: () => setDraftBody(''),
                onError,
                onFinish: () => setBusy(false),
            },
        );
    }

    function updateNote(id: number, body: string) {
        router.patch(
            route('resume-notes.update', id),
            { body },
            { preserveScroll: true, onError },
        );
    }

    function deleteNote(id: number) {
        router.delete(route('resume-notes.destroy', id), {
            preserveScroll: true,
            onError,
        });
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Private notes
                </h3>
                <span className="text-[10px] text-gray-400">
                    Not on the resume
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                </div>
            )}

            <div className="mb-3 flex flex-col gap-2">
                <Textarea
                    rows={2}
                    value={draftBody}
                    placeholder="Remind yourself about this version…"
                    onChange={(event) => setDraftBody(event.target.value)}
                    className="text-sm"
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={addNote}
                    className="self-start"
                >
                    <PlusIcon className="size-3.5" />
                    Add note
                </Button>
            </div>

            {notes.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                    No notes yet. Use these for private reminders while editing.
                </p>
            ) : (
                <ul className="space-y-2">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className="rounded-lg border border-amber-100 bg-amber-50/60 p-2"
                        >
                            <Textarea
                                rows={2}
                                defaultValue={note.body}
                                className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                                onBlur={(event) => {
                                    if (event.target.value !== note.body) {
                                        updateNote(note.id, event.target.value);
                                    }
                                }}
                            />
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">
                                    {note.created_at}
                                </span>
                                <button
                                    type="button"
                                    aria-label="Delete note"
                                    onClick={() => deleteNote(note.id)}
                                    className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600"
                                >
                                    <TrashIcon className="size-3.5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
