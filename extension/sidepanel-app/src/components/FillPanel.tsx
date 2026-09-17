import { useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import { useResumes } from '@/hooks/useResumes';

interface FillPanelProps {
    resumes: ReturnType<typeof useResumes>;
}

export function FillPanel({ resumes }: FillPanelProps) {
    const [filling, setFilling] = useState(false);
    const [helper, setHelper] = useState('Only empty fields. You submit.');
    const [previewOpen, setPreviewOpen] = useState(false);

    const group = resumes.groups.find((g) => String(g.id ?? '0') === String(resumes.selectedGroupId ?? '0')) || resumes.groups[0];
    const versions = group?.versions || [];

    async function handleFill() {
        if (!resumes.profile) {
            toast.warning('Select a resume first.');
            return;
        }
        setFilling(true);
        const result = await sendMessage<{ filled?: number; message?: string }>('FILL_COMMON_FIELDS', { profile: resumes.profile });
        setFilling(false);

        if (!result.ok) {
            toast.warning(result.message || 'No fillable fields found on this page');
            setHelper('Open the application form, then try again. Or use Insert below.');
            return;
        }
        const filled = result.filled || 0;
        if (filled > 0) {
            toast.success(result.message || `Filled ${filled} fields`);
        } else {
            toast.warning(result.message || `Filled ${filled} fields`);
        }
        setHelper('Review the form before you submit.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Resume</div>
            <Select
                aria-label="Resume group"
                value={String(resumes.selectedGroupId ?? '0')}
                onChange={(e) => resumes.selectGroup(e.target.value === '0' ? null : Number(e.target.value))}
            >
                {resumes.groups.map((g) => (
                    <option key={String(g.id ?? '0')} value={String(g.id ?? '0')}>
                        {g.title || 'Untitled resume'}
                    </option>
                ))}
            </Select>
            <Select
                aria-label="Version"
                value={String(resumes.selectedResumeId ?? '')}
                onChange={(e) => resumes.selectResume(Number(e.target.value))}
            >
                {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                        {v.version_label || 'v?'} · Updated {relativeTime(v.updated_at)}
                    </option>
                ))}
            </Select>

            {resumes.profile && (
                <div className="text-xs text-muted-foreground">
                    <div>{[resumes.profile.contact?.full_name, resumes.profile.target_role].filter(Boolean).join(' · ')}</div>
                    <div>{[resumes.profile.contact?.email, resumes.profile.contact?.phone, resumes.profile.contact?.location].filter(Boolean).join(' · ')}</div>
                </div>
            )}

            <Button className="w-full" onClick={handleFill} disabled={filling}>
                {filling ? 'Filling…' : 'Fill common fields'}
            </Button>
            <p className="text-xs text-muted-foreground">{helper}</p>

            <button type="button" className="text-left text-xs text-primary" onClick={() => setPreviewOpen((o) => !o)}>
                {previewOpen ? '▾ Hide preview' : '▸ Preview details'}
            </button>
            {previewOpen && resumes.profile && (
                <div className="rounded-md border p-3 text-xs">
                    <h3 className="font-semibold">Contact</h3>
                    <p>
                        {resumes.profile.contact?.full_name}<br />
                        {resumes.profile.contact?.email}<br />
                        {resumes.profile.contact?.phone}<br />
                        {resumes.profile.contact?.location}<br />
                        {resumes.profile.contact?.linkedin}
                    </p>
                    <h3 className="font-semibold">Summary</h3>
                    <p>{clamp(resumes.profile.summary || '—', 280)}</p>
                    <h3 className="font-semibold">Latest role</h3>
                    <p>
                        {resumes.profile.latest_role?.one_liner || '—'}
                        {(resumes.profile.latest_role?.bullets || []).slice(0, 3).map((b, i) => (
                            <span key={i}><br />• {b}</span>
                        ))}
                    </p>
                    <h3 className="font-semibold">Skills</h3>
                    <p>{resumes.profile.skills_csv || '—'}</p>
                    <button
                        type="button"
                        className="mt-2 text-primary underline-offset-4 hover:underline"
                        onClick={() => sendMessage('OPEN_APP', { path: `/resumes/${resumes.profile!.resume_id}/workstation` })}
                    >
                        Edit in Resumegen
                    </button>
                </div>
            )}
        </div>
    );
}

function clamp(str: string, n: number): string {
    return str.length <= n ? str : `${str.slice(0, n)}…`;
}

function relativeTime(iso: string): string {
    if (!iso) {
        return 'recently';
    }
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (Number.isNaN(diff)) {
        return 'recently';
    }
    if (diff < 60) {
        return 'just now';
    }
    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }
    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }
    if (diff < 86400 * 14) {
        return `${Math.floor(diff / 86400)}d ago`;
    }
    return new Date(iso).toLocaleDateString();
}
