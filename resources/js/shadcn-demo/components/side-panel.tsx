import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, RotateCcwIcon, StickyNoteIcon } from 'lucide-react';
import { Button } from '@/shadcn-demo/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shadcn-demo/components/ui/sheet';
import { Separator } from '@/shadcn-demo/components/ui/separator';
import { Textarea } from '@/shadcn-demo/components/ui/textarea';
import { ScrollArea } from '@/shadcn-demo/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shadcn-demo/components/ui/alert-dialog';
import { SAMPLE_NOTES, SAMPLE_SNAPSHOTS, type DemoNote } from '@/shadcn-demo/types';

export function SidePanel({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [notes, setNotes] = useState<DemoNote[]>(SAMPLE_NOTES);
    const [draft, setDraft] = useState('');

    function addNote() {
        if (draft.trim() === '') return;

        setNotes([{ id: crypto.randomUUID(), body: draft, created_at: 'Just now' }, ...notes]);
        setDraft('');
        toast.success('Note added');
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Notes & checkpoints</SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
                    <section className="flex flex-col gap-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                            <StickyNoteIcon className="size-4" />
                            Notes
                        </h3>
                        <div className="flex gap-2">
                            <Textarea
                                rows={2}
                                placeholder="Leave a note to yourself…"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                            />
                        </div>
                        <Button size="sm" className="self-start" onClick={addNote}>
                            <PlusIcon />
                            Add note
                        </Button>
                        <ScrollArea className="h-40 rounded-md border">
                            <ul className="flex flex-col gap-2 p-2">
                                {notes.map((note) => (
                                    <li key={note.id} className="rounded-md border p-2 text-sm">
                                        <p>{note.body}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {note.created_at}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </section>

                    <Separator />

                    <section className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">Snapshots</h3>
                        <ul className="flex flex-col gap-2">
                            {SAMPLE_SNAPSHOTS.map((snapshot) => (
                                <li
                                    key={snapshot.id}
                                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">{snapshot.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {snapshot.created_at}
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <RotateCcwIcon />
                                                Restore
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This would replace the current draft with "{snapshot.label}"
                                                    ({snapshot.created_at}). Demo only — nothing changes.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => toast.success(`Restored "${snapshot.label}" (demo)`)}
                                                >
                                                    Restore
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    );
}
