import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    resume: { id: number; name: string };
    previewUrl: string;
    note: string;
    orgName: string;
    candidateName: string | null;
};

export default function OrgResume({ resume, previewUrl, note: initialNote, orgName, candidateName }: Props) {
    const [note, setNote] = useState(initialNote);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const saveNote = async () => {
        if (!note.trim()) return;
        setSaving(true);
        setSaved(false);
        try {
            await fetch(route('org.resume.notes', resume.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ body: note }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="flex h-[calc(100vh-52px)] flex-col">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 border-b border-[#eeeef5] bg-white px-6 py-3 text-sm">
                    <Link href={route('org.show')} className="text-[#4f46e5] hover:underline">{orgName}</Link>
                    <span className="text-[#a0a0b0]">/</span>
                    <span className="text-[#23232d]">{candidateName ?? 'Candidate'}</span>
                    <span className="text-[#a0a0b0]">/</span>
                    <span className="font-medium text-[#23232d]">{resume.name}</span>
                </div>

                {/* Split panel */}
                <div className="flex flex-1 overflow-hidden">
                    {/* PDF preview */}
                    <div className="flex-1 bg-[#f5f5fb]">
                        <iframe
                            src={previewUrl}
                            className="h-full w-full border-0"
                            title={resume.name}
                        />
                    </div>

                    {/* Notes panel */}
                    <div className="flex w-80 flex-col border-l border-[#eeeef5] bg-white p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[#23232d]">Recruiter note</h2>
                            {saved && <span className="text-xs text-green-600">Saved</span>}
                            {saving && <span className="text-xs text-[#a0a0b0]">Saving…</span>}
                        </div>
                        <p className="mb-3 text-xs text-[#a0a0b0]">
                            Private — only visible to you. The candidate sees this as a read-only note in their editor.
                        </p>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            onBlur={saveNote}
                            rows={12}
                            maxLength={2000}
                            placeholder="Add notes about this candidate's resume…"
                            className="flex-1 resize-none rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        <p className="mt-1 text-right text-xs text-[#a0a0b0]">{note.length}/2000</p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
