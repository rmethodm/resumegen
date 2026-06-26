import { useState, useRef, DragEvent } from 'react';

interface ParsedFields {
    contact: {
        full_name: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
        linkedin: string | null;
        github: string | null;
        website: string | null;
    } | null;
    summary: string | null;
    experience: unknown[] | null;
    education: unknown[] | null;
    projects: unknown[] | null;
    skills: string[] | null;
    certifications: unknown[] | null;
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
    const [useAi, setUseAi] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    function submit(file: File) {
        setLoading(true);
        setError(null);
        setResult(null);

        const data = new FormData();
        data.append('file', file);
        data.append('use_ai', useAi ? '1' : '0');

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
                <p className="text-sm text-gray-500">PDF and DOCX parsed directly; JPEG extracted via OpenAI Vision (gpt-4o).</p>

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
                        accept=".pdf,.docx,.doc,.jpeg,.jpg"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { submit(f); } }}
                    />
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
                            <p className="text-sm text-gray-500">Extracting &amp; parsing resume with AI…</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 font-medium">Drop a PDF, DOCX, or JPEG here</p>
                            <p className="text-xs text-gray-400 mt-1">or click to browse · max 5 MB</p>
                        </>
                    )}
                </div>

                {/* AI toggle — only matters for JPEG */}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={useAi}
                        onChange={(e) => setUseAi(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                    />
                    Use AI extraction for images (gpt-4o) — uncheck to use Tesseract OCR
                </label>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {result && (
                    <>
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-green-700 font-medium">Resume created from import</p>
                        <a
                            href={route('builder.edit', result.resume_id)}
                            className="text-sm font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
                        >
                            Open in Builder →
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Detected fields */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                            <h2 className="font-semibold text-gray-800">Parsed Fields</h2>

                            <Field label="Name" value={result.fields.contact?.full_name} />
                            <Field label="Email" value={result.fields.contact?.email} />
                            <Field label="Phone" value={result.fields.contact?.phone} />
                            <Field label="Location" value={result.fields.contact?.location} />
                            <Field label="LinkedIn" value={result.fields.contact?.linkedin} />
                            <Field label="GitHub" value={result.fields.contact?.github} />
                            <Field label="Website" value={result.fields.contact?.website} />
                            <Field label="Summary" value={result.fields.summary} />

                            <Count label="Experience entries" items={result.fields.experience} />
                            <Count label="Education entries" items={result.fields.education} />
                            <Count label="Projects" items={result.fields.projects} />
                            <Count label="Certifications" items={result.fields.certifications} />

                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Skills</p>
                                {result.fields.skills?.length ? (
                                    <p className="text-sm text-gray-800">{result.fields.skills.join(', ')}</p>
                                ) : (
                                    <p className="text-sm text-gray-300 italic">none</p>
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

                    {/* Raw response JSON */}
                    <div className="bg-gray-900 rounded-xl p-5">
                        <h2 className="font-semibold text-gray-300 mb-3 text-sm">Raw Response JSON</h2>
                        <pre className="text-xs text-green-400 whitespace-pre-wrap overflow-y-auto max-h-[400px] font-mono leading-relaxed">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                    </>
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

function Count({ label, items }: { label: string; items: unknown[] | null | undefined }) {
    const count = items?.length ?? 0;
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-sm mt-0.5 ${count > 0 ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                {count > 0 ? count : 'none'}
            </p>
        </div>
    );
}
