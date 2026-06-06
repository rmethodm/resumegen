import { router } from '@inertiajs/react';
import React, { useRef, useState } from 'react';

interface ImportedData {
    contact: Record<string, string>;
    summary: string;
    experience: unknown[];
    education: unknown[];
    skills: string[];
    certifications: unknown[];
    [key: string]: unknown;
}

interface ExtractResult {
    data: ImportedData;
    detected_name: string;
}

interface Props {
    resumes: { id: number; name: string }[];
    onClose: () => void;
    initialTab?: 'pdf' | 'linkedin';
}

const LINKEDIN_STEPS = [
    'Go to LinkedIn → Me (top right) → Settings & Privacy',
    'Select "Data privacy" → "Get a copy of your data"',
    'Choose "Want something in particular?" → check Profile → click "Request archive"',
    'LinkedIn emails you a download link (usually within minutes). Download the ZIP, open it, and upload the PDF named "Profile.pdf" below.',
];

export default function PdfImportModal({ resumes, onClose, initialTab = 'pdf' }: Props) {
    const [activeTab, setActiveTab] = useState<'pdf' | 'linkedin'>(initialTab);
    const [step, setStep] = useState<'upload' | 'destination'>('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [extracted, setExtracted] = useState<ExtractResult | null>(null);
    const [action, setAction] = useState<'new' | 'overwrite'>('new');
    const [newName, setNewName] = useState('');
    const [resumeId, setResumeId] = useState<number | null>(resumes[0]?.id ?? null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { return; }
        setError(null);
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('hint', activeTab === 'linkedin' ? 'linkedin' : 'generic');
        formData.append('_token', (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '');

        try {
            const res = await fetch(route('import.pdf.extract'), { method: 'POST', body: formData });
            const json = await res.json();
            if (!res.ok) { setError(json.error ?? 'Upload failed.'); setLoading(false); return; }
            setExtracted(json);
            setNewName(activeTab === 'linkedin'
                ? `${json.detected_name} — LinkedIn`
                : `${json.detected_name} — Imported`);
            setStep('destination');
        } catch {
            setError('Upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!extracted) { return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.post(route('import.pdf.confirm'), {
            data: extracted.data as any,
            action,
            resume_id: action === 'overwrite' ? resumeId : null,
            name: action === 'new' ? newName : undefined,
            hint: activeTab,
        } as any);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Import Resume</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {step === 'upload' && (
                    <>
                        {/* Tab bar */}
                        <div className="mb-4 flex rounded-lg border border-gray-200 p-0.5">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('pdf'); setError(null); }}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                PDF Resume
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('linkedin'); setError(null); }}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${activeTab === 'linkedin' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                From LinkedIn
                            </button>
                        </div>

                        {activeTab === 'pdf' ? (
                            <div>
                                <div
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50 py-10 hover:border-indigo-400"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <span className="text-3xl">📄</span>
                                    <p className="mt-2 text-sm font-medium text-indigo-600">Click to choose a PDF</p>
                                    <p className="text-xs text-gray-500">Text-based PDFs only · Max 5 MB</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-blue-50 p-4">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">How to download your LinkedIn PDF</p>
                                    <ol className="space-y-2">
                                        {LINKEDIN_STEPS.map((s, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-gray-700">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">{i + 1}</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                <div
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 py-6 hover:border-blue-400"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <span className="text-2xl">📎</span>
                                    <p className="mt-1 text-sm font-medium text-blue-600">Upload Profile.pdf from LinkedIn</p>
                                    <p className="text-xs text-gray-500">Max 5 MB</p>
                                </div>
                            </div>
                        )}

                        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
                        {loading && <p className="mt-3 text-center text-sm text-indigo-600">Analyzing your resume…</p>}
                        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
                    </>
                )}

                {step === 'destination' && extracted && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                            Detected: <strong>{extracted.detected_name}</strong>
                        </p>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" checked={action === 'new'} onChange={() => setAction('new')} />
                                Create new resume
                            </label>
                            {action === 'new' && (
                                <input
                                    className="ml-6 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Resume name"
                                />
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" checked={action === 'overwrite'} onChange={() => setAction('overwrite')} />
                                Overwrite existing resume
                            </label>
                            {action === 'overwrite' && (
                                <>
                                    <select
                                        className="ml-6 block w-full rounded-md border-gray-300 text-sm shadow-sm"
                                        value={resumeId ?? ''}
                                        onChange={e => setResumeId(Number(e.target.value))}
                                    >
                                        {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <p className="ml-6 text-xs text-amber-600">This cannot be undone.</p>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setStep('upload')} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Back</button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={action === 'new' && !newName.trim()}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Import
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
