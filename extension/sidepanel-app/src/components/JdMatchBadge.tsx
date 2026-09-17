import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile } from '@/lib/types';

interface JdMatchBadgeProps {
    profile: FillProfile | null;
}

export function JdMatchBadge({ profile }: JdMatchBadgeProps) {
    async function show() {
        if (!profile) {
            toast.warning('Select a resume first.');
            return;
        }
        const result = await sendMessage<{ total?: number; score?: number }>('DETECT_JD_BADGE', { profile });
        if (!result.ok) {
            toast.warning(result.message || 'Could not show a match badge on this page.');
            return;
        }
        if ((result.total || 0) === 0) {
            toast.warning('This resume has no job description set yet — right-click selected text on the page to set one.');
            return;
        }
        toast.success(`Match badge shown: ${result.score}%`);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Job description match</div>
            <p className="text-xs text-muted-foreground">
                Select text on the page, right-click, and choose &quot;Set as Resumegen job description&quot; to update this resume&apos;s target JD. Then check the match:
            </p>
            <Button variant="secondary" className="w-full" onClick={show}>
                Show match badge on page
            </Button>
        </div>
    );
}
