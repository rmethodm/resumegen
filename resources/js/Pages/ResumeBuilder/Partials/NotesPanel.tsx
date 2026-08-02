import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Note {
    id: number;
    body: string;
    created_at: string;
}

interface Props {
    notes: Note[];
    resumeId: number;
}

export default function NotesPanel({ notes, resumeId }: Props) {
    const [draft, setDraft] = useState('');

    const addNote = () => {
        if (!draft.trim()) return;

        router.post(route('builder.notes.store', resumeId), { body: draft }, {
            preserveScroll: true,
            onSuccess: () => setDraft(''),
        });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Add a private reminder for tailoring this resume…"
                    rows={2}
                    className="w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                    type="button"
                    onClick={addNote}
                    disabled={!draft.trim()}
                    className="self-end rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                    Add note
                </button>
            </div>

            {notes.length === 0 && (
                <p className="text-xs text-gray-400">No notes yet.</p>
            )}

            {notes.map(n => (
                <NoteCard key={n.id} note={n} resumeId={resumeId} />
            ))}
        </div>
    );
}

function NoteCard({ note, resumeId }: { note: Note; resumeId: number }) {
    const [body, setBody] = useState(note.body);

    const save = () => {
        if (body === note.body || !body.trim()) return;
        router.patch(route('builder.notes.update', [resumeId, note.id]), { body }, { preserveScroll: true });
    };

    return (
        <div className="rounded-md border border-gray-100 bg-white p-3 text-xs">
            <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onBlur={save}
                rows={2}
                className="w-full resize-none border-0 p-0 text-gray-700 focus:ring-0"
            />
            <div className="mt-2 flex items-center justify-between text-gray-400">
                <span>{note.created_at}</span>
                <button
                    type="button"
                    onClick={() => router.delete(route('builder.notes.destroy', [resumeId, note.id]), { preserveScroll: true })}
                    className="text-red-500 hover:text-red-700"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
