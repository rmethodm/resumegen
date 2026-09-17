import { Button } from '@/components/ui/button';
import { HelpPanel } from '@/components/HelpPanel';

interface HelpViewProps {
    onBack: () => void;
}

export function HelpView({ onBack }: HelpViewProps) {
    return (
        <div className="flex flex-col gap-3">
            <Button variant="link" className="self-start" onClick={onBack}>← Back</Button>
            <h1 className="text-left text-lg font-semibold">Help</h1>
            <HelpPanel />
        </div>
    );
}
