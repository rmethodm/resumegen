import { router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';

export type ResumeOption = { id: number; title: string };

export function AddToPoolDialog({
    open,
    onClose,
    jobListingId,
    resumes,
}: {
    open: boolean;
    onClose: () => void;
    jobListingId: number | null;
    resumes: ResumeOption[];
}) {
    const [resumeId, setResumeId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (jobListingId === null || !resumeId) {
            return;
        }

        setProcessing(true);
        setError(null);

        router.post(
            route('job-pool.store'),
            { job_listing_id: jobListingId, resume_id: Number(resumeId) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResumeId('');
                    onClose();
                },
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not add to pool.');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold">Add to pool</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div>
                        <Label>Resume</Label>
                        <Select
                            value={resumeId}
                            onChange={(e) => setResumeId(e.target.value)}
                            className="mt-1"
                            required
                        >
                            <option value="">Select a resume</option>
                            {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.title}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || !resumeId}>
                            Add to pool
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
