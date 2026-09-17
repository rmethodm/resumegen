import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessage } from '@/lib/chrome-messaging';

export function TrackApplication() {
    const [formOpen, setFormOpen] = useState(false);
    const [jobUrl, setJobUrl] = useState('');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');

    async function detect() {
        const result = await sendMessage<{ meta?: { company?: string; role?: string }; url?: string }>('DETECT_JOB_POSTING');
        if (!result.ok) {
            toast.warning(result.message || 'Could not read this page.');
            return;
        }
        setCompany(result.meta?.company || '');
        setRole(result.meta?.role || '');
        setJobUrl(result.url || '');
        setFormOpen(true);
    }

    async function save() {
        const trimmedCompany = company.trim();
        const trimmedRole = role.trim();
        if (!trimmedCompany || !trimmedRole) {
            toast.warning('Company and role are required.');
            return;
        }
        const result = await sendMessage('SAVE_JOB_APPLICATION', { company: trimmedCompany, role: trimmedRole, jobUrl });
        if (!result.ok) {
            toast.warning(result.message || 'Could not save to your tracker.');
            return;
        }
        setFormOpen(false);
        toast.success('Saved to your job tracker.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Track this application</div>
            <Button variant="secondary" className="w-full" onClick={detect}>
                Save to tracker
            </Button>
            {formOpen && (
                <div className="rounded-md border p-2">
                    <Input
                        aria-label="Company"
                        placeholder="Company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="mb-2"
                    />
                    <Input
                        aria-label="Role"
                        placeholder="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mb-2"
                    />
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={save}>Save</Button>
                        <Button variant="link" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
