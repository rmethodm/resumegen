import type {
    Contact, ExperienceEntry, ProjectEntry, EducationEntry, CertEntry,
} from '@/types';
import { useMemo, useState } from 'react';

export interface ResumeContent {
    contact: Contact;
    summary: string;
    experience: ExperienceEntry[];
    projects: ProjectEntry[];
    education: EducationEntry[];
    certifications: CertEntry[];
    flatSkills: string[];
    skillGroups: { category: string; items: string[] }[];
    skillNarratives: { name: string; bullets: string[] }[];
    sectionOrder: string[];
}

type Props = ResumeContent;

/** Normalize a bullets textarea (one per line) into plain "- " lines. */
function bulletLines(raw: string): string[] {
    return raw
        .split('\n')
        .map(l => l.replace(/^\s*[•\-*]\s*/, '').trim())
        .filter(Boolean)
        .map(l => `- ${l}`);
}

function joinFilled(parts: (string | undefined)[], sep: string): string {
    return parts.map(p => p?.trim()).filter(Boolean).join(sep);
}

/** Build the ATS-style plain-text dump in the resume's own section order. */
export function buildPlainText(p: ResumeContent): string {
    const out: string[] = [];

    // Header — always contact first.
    if (p.contact.full_name?.trim()) { out.push(p.contact.full_name.trim()); }
    const contactLine = joinFilled(
        [p.contact.email, p.contact.phone, p.contact.location, p.contact.linkedin, p.contact.website],
        ' | ',
    );
    if (contactLine) { out.push(contactLine); }

    const section = (title: string, body: string[]) => {
        if (body.length === 0) { return; }
        out.push('', title.toUpperCase(), ...body);
    };

    for (const key of p.sectionOrder) {
        if (key === 'summary' && p.summary.trim()) {
            section('Summary', [p.summary.trim()]);
        }

        if (key === 'experience') {
            const body: string[] = [];
            for (const e of p.experience) {
                const head = joinFilled([e.title, e.company], ' — ');
                const dates = joinFilled([e.start_date, e.current ? 'Present' : e.end_date], ' – ');
                if (head) { body.push(head); }
                if (dates) { body.push(dates); }
                body.push(...bulletLines(e.bullets ?? ''));
                body.push('');
            }
            section('Experience', body.length ? body.slice(0, -1) : body);
        }

        if (key === 'projects') {
            const body: string[] = [];
            for (const pr of p.projects) {
                const head = joinFilled([pr.name, pr.url], ' — ');
                if (head) { body.push(head); }
                if (pr.description?.trim()) { body.push(pr.description.trim()); }
                body.push(...bulletLines(pr.bullets ?? ''));
                body.push('');
            }
            section('Projects', body.length ? body.slice(0, -1) : body);
        }

        if (key === 'education') {
            const body: string[] = [];
            for (const ed of p.education) {
                const line = joinFilled([joinFilled([ed.degree, ed.field], ' '), ed.school], ', ');
                body.push(joinFilled([line, ed.grad_year], '  '));
            }
            section('Education', body.filter(Boolean));
        }

        if (key === 'skills') {
            const body: string[] = [];
            for (const g of p.skillGroups) {
                if (g.items.length) { body.push(`${g.category}: ${g.items.join(', ')}`); }
            }
            if (p.flatSkills.length) { body.push(p.flatSkills.join(', ')); }
            for (const n of p.skillNarratives) {
                if (n.bullets.length) { body.push(n.name, ...bulletLines(n.bullets.join('\n'))); }
            }
            section('Skills', body);
        }

        if (key === 'certifications') {
            const body: string[] = [];
            for (const c of p.certifications) {
                body.push(joinFilled([joinFilled([c.name, c.issuer], ' — '), c.date], '  '));
                if (c.credential_id?.trim()) { body.push(`credential: ${c.credential_id.trim()}`); }
            }
            section('Certifications', body.filter(Boolean));
        }
    }

    return out.join('\n');
}

export default function PlainTextView(props: Props) {
    const text = useMemo(() => buildPlainText(props), [props]);
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable — ignore */ }
    };

    return (
        <div className="absolute inset-0 overflow-auto bg-white">
            <button
                type="button"
                onClick={copy}
                className="sticky left-full top-2 z-10 mr-2 rounded-md border border-surface-border bg-white px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
            <pre className="whitespace-pre-wrap px-4 pb-4 font-mono text-xs leading-relaxed text-ink">
                {text || 'Nothing to show yet — fill in the resume form.'}
            </pre>
        </div>
    );
}
