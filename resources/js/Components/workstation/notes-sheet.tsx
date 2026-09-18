import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/Components/ui/sheet';
import { NotesPanel, type WorkstationNote } from '@/Components/workstation/notes-panel';
import {
    SnapshotsPanel,
    type WorkstationSnapshot,
} from '@/Components/workstation/snapshots-panel';

export function NotesSheet({
    open,
    onOpenChange,
    resumeId,
    notes,
    snapshots,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resumeId: number;
    notes: WorkstationNote[];
    snapshots: WorkstationSnapshot[];
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Notes & checkpoints</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4">
                    <NotesPanel resumeId={resumeId} notes={notes} />
                    <SnapshotsPanel resumeId={resumeId} snapshots={snapshots} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
