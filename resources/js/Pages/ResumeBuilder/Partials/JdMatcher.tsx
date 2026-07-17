import { buildPlainText, type ResumeContent } from './PlainTextView';
import { useMemo, useState } from 'react';

interface Props {
    content: ResumeContent;
    initialJd: string;
}

// Common English + resume/JD filler words that carry no signal for keyword matching.
const STOPWORDS = new Set([
    'the', 'and', 'for', 'you', 'your', 'our', 'with', 'will', 'are', 'this', 'that', 'have',
    'has', 'from', 'not', 'but', 'all', 'can', 'able', 'ability', 'who', 'they', 'their', 'them',
    'a', 'an', 'to', 'of', 'in', 'on', 'as', 'at', 'by', 'or', 'is', 'be', 'we', 'us', 'it',
    'work', 'working', 'team', 'teams', 'role', 'job', 'position', 'company', 'strong', 'years',
    'year', 'experience', 'experienced', 'skills', 'skill', 'required', 'requirements', 'preferred',
    'plus', 'including', 'include', 'includes', 'etc', 'per', 'via', 'into', 'across', 'within',
    'looking', 'seeking', 'candidate', 'candidates', 'help', 'new', 'other', 'more', 'well',
    'must', 'should', 'would', 'about', 'using', 'use', 'used', 'such', 'both', 'while', 'also',
]);

/** Split text into lowercase tokens, keeping tech punctuation (node.js, ci/cd, c++). */
function tokenize(text: string): string[] {
    return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#./-]*/g) ?? [])
        .map(t => t.replace(/[.\-/]+$/, '')) // trim trailing separators
        .filter(Boolean);
}

interface MatchResult {
    matched: string[];
    missing: string[];
    score: number;
}

/** Deterministic keyword overlap between a JD and the resume text. */
function matchJd(jd: string, resumeText: string): MatchResult {
    const resumeTokens = new Set(tokenize(resumeText));

    // Rank JD keywords by frequency, keep the meaningful ones.
    const freq = new Map<string, number>();
    for (const tok of tokenize(jd)) {
        if (tok.length < 2 || STOPWORDS.has(tok) || /^\d+$/.test(tok)) { continue; }
        freq.set(tok, (freq.get(tok) ?? 0) + 1);
    }
    const keywords = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([k]) => k);

    const matched = keywords.filter(k => resumeTokens.has(k));
    const missing = keywords.filter(k => !resumeTokens.has(k));
    const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
    return { matched, missing, score };
}

export default function JdMatcher({ content, initialJd }: Props) {
    const [jd, setJd] = useState(initialJd);
    const resumeText = useMemo(() => buildPlainText(content), [content]);
    const { matched, missing, score } = useMemo(() => matchJd(jd, resumeText), [jd, resumeText]);

    const hasJd = jd.trim().length > 0;
    const scoreColor = score <= 40 ? 'text-red-600' : score <= 70 ? 'text-amber-600' : 'text-green-600';
    const barColor = score <= 40 ? 'bg-red-400' : score <= 70 ? 'bg-amber-400' : 'bg-green-500';

    return (
        <div className="absolute inset-0 overflow-auto bg-white p-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Paste the job description
            </label>
            <textarea
                value={jd}
                onChange={e => setJd(e.target.value)}
                rows={6}
                placeholder="Paste the full job posting here to see which of its keywords your resume already covers."
                className="w-full resize-y rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:border-[#2563eb] focus:ring-[#3b82f6] focus:outline-none"
            />

            {hasJd && (
                <div className="mt-4 space-y-4">
                    {/* Score */}
                    <div>
                        <div className="mb-1 flex items-baseline justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">Keyword coverage</span>
                            <span className={`text-sm font-bold ${scoreColor}`}>{score}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-[#94a3b8]">{matched.length} of {matched.length + missing.length} top keywords found in your resume.</p>
                    </div>

                    {/* Missing — the actionable gap */}
                    {missing.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Missing keywords</p>
                            <div className="flex flex-wrap gap-1.5">
                                {missing.map(k => (
                                    <span key={k} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">{k}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matched */}
                    {matched.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-green-700">Already covered</p>
                            <div className="flex flex-wrap gap-1.5">
                                {matched.map(k => (
                                    <span key={k} className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800">{k}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-[11px] leading-relaxed text-[#94a3b8]">
                        Simple keyword overlap — exact word matches only, no synonyms or stemming. Use it as a checklist, not a score to chase.
                    </p>
                </div>
            )}
        </div>
    );
}
