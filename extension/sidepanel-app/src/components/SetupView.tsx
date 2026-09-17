import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';

export function SetupView() {
    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl" aria-hidden="true">🔗</div>
            <h1 className="text-lg font-semibold">Connect your Resumegen account</h1>
            <p className="text-sm text-muted-foreground">
                Pull contact details and experience from your resumes into job forms.
                Nothing is submitted for you.
            </p>
            <Button className="w-full" onClick={() => sendMessage('OPEN_APP', { path: '/extension/connect' })}>
                Connect to Resumegen
            </Button>
            <p className="text-xs text-muted-foreground">
                Takes about a minute. Generate a token on Profile, then paste it in Settings.
            </p>
            <Button variant="link" onClick={() => chrome.runtime.openOptionsPage()}>
                Open Settings
            </Button>
        </div>
    );
}
