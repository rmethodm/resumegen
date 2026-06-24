import { useState, useRef, DragEvent } from 'react';
import { router } from '@inertiajs/react';

interface ParsedFields {
    name: string | null;
    emails: string[];
    phones: string[];
    linkedin: string | null;
    github: string | null;
    sections: string[];
    line_count: number;
    char_count: number;
}

interface Result {
    filename: string;
    extension: string;
    raw_text: string;
    fields: ParsedFields;
    resume_id: number;
}

export default function ImportTest() {
    const [result, setResult] = useState<Result | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    function submit(file: File) {
        setLoading(true);
        setError(null);
        setResult(null);

        const data = new FormData();
        data.append('file', file);

        fetch(route('import-test.extract'), {
            method: 'POST',
            body: data,
            headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message ?? `HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(setResult)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) { submit(file); }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">DEV TOOL</span>
                    <h1 className="text-2xl font-bold text-gray-900">Resume Import Test</h1>
                </div>
                <p className="text-sm text-gray-500">Free/deterministic parsing — no AI. PDF and DOCX only.</p>

                {/* Upload zone */}
                <div
                    onDrop={onDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { submit(f); } }}
                    />
                    {loading ? (
                        <p className="text-gray-500 animate-pulse">Extracting text…</p>
                    ) : (
                        <>
                            <p className="text-gray-600 font-medium">Drop a PDF or DOCX here</p>
                            <p className="text-xs text-gray-400 mt-1">or click to browse · max 5 MB</p>
                        </>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {result && (
                    <a
                        href={route('builder.edit', { resume: result.resume_id })}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                    >
                        View imported resume →
                    </a>
                )}

                {result && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Detected fields */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                            <h2 className="font-semibold text-gray-800">
                                Detected Fields
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                    {result.fields.char_count.toLocaleString()} chars · {result.fields.line_count} lines
                                </span>
                            </h2>

                            <Field label="Filename" value={result.filename} />
                            <Field label="Name (line 1)" value={result.fields.name} />
                            <Field label="Email" value={result.fields.emails.join(', ') || null} />
                            <Field label="Phone" value={result.fields.phones.join(', ') || null} />
                            <Field label="LinkedIn" value={result.fields.linkedin} />
                            <Field label="GitHub" value={result.fields.github} />

                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sections detected</p>
                                {result.fields.sections.length > 0 ? (
                                    <ul className="space-y-1">
                                        {result.fields.sections.map((s, i) => (
                                            <li key={i} className="text-sm bg-gray-50 rounded px-2 py-1 font-mono">{s}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">None detected</p>
                                )}
                            </div>
                        </div>

                        {/* Raw text */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h2 className="font-semibold text-gray-800 mb-3">Raw Extracted Text</h2>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-y-auto max-h-[600px] font-mono leading-relaxed">
                                {result.raw_text || '(empty)'}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-sm mt-0.5 ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                {value ?? 'not found'}
            </p>
        </div>
    );
}
