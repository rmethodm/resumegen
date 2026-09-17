import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';

interface EmptyViewProps {
    email?: string;
    onRefresh: () => void;
}

export function EmptyView({ email, onRefresh }: EmptyViewProps) {
    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success" /> Connected{email ? ` · ${email}` : ''}
            </div>
            <div className="text-4xl" aria-hidden="true">📄</div>
            <h1 className="text-lg font-semibold">No resumes yet</h1>
            <p className="text-sm text-muted-foreground">
                Create a resume in Resumegen, then come back here to fill applications.
            </p>
            <Button className="w-full" onClick={() => sendMessage('OPEN_APP', { path: '/dashboard' })}>
                Create a resume
            </Button>
            <Button variant="link" onClick={onRefresh}>Refresh</Button>
        </div>
    );
}
