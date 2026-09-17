import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile } from '@/lib/types';

const INSERT_LABELS: Record<string, string> = {
    full_name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    linkedin: 'LinkedIn',
    location: 'Location',
    summary: 'Summary',
    skills: 'Skills',
    latest_role: 'Latest role',
    latest_role_bullets: 'Latest role bullets',
};

const CHIP_KEYS = ['full_name', 'email', 'phone', 'linkedin', 'location', 'summary', 'skills', 'latest_role'];

interface InsertChipsProps {
    profile: FillProfile | null;
}

export function InsertChips({ profile }: InsertChipsProps) {
    async function insert(key: string) {
        const label = INSERT_LABELS[key] || key;
        const text = profile?.inserts?.[key] || '';

        if (!text) {
            toast.warning(`No ${label} on this resume. Add it in Resumegen.`);
            return;
        }

        const result = await sendMessage<{ message?: string }>('INSERT_FOCUSED', { text, label });
        if (!result.ok) {
            toast.warning(result.message || 'Click a text field on the page first, then insert.');
            return;
        }
        toast.success(result.message || `Inserted ${label} into the focused field.`);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Insert into focused field</div>
            <div className="flex flex-wrap gap-1.5">
                {CHIP_KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        title={`Insert ${INSERT_LABELS[key]} into the focused field`}
                        className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                        onClick={() => insert(key)}
                    >
                        {INSERT_LABELS[key]}
                    </button>
                ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => insert('latest_role_bullets')}>
                Latest role bullets
            </Button>
        </div>
    );
}
