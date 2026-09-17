import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FileInputField } from '@/lib/types';

interface AttachResumeProps {
    resumeId: number | null;
}

export function AttachResume({ resumeId }: AttachResumeProps) {
    const [fields, setFields] = useState<FileInputField[]>([]);

    async function scan() {
        const result = await sendMessage<{ fields?: FileInputField[] }>('DETECT_FILE_INPUTS');
        if (!result.ok) {
            toast.warning(result.message || 'Could not scan this page for a resume upload.');
            return;
        }
        const found = result.fields || [];
        setFields(found);
        if (found.length === 0) {
            toast.warning('No resume upload field found on this page.');
        }
    }

    async function attach(fieldId: string) {
        if (!resumeId) {
            toast.warning('Select a resume first.');
            return;
        }
        const result = await sendMessage('ATTACH_RESUME_PDF', { fieldId, resumeId });
        if (!result.ok) {
            toast.warning(result.message || 'This site rejected the automatic attach — download and upload it manually.');
            return;
        }
        toast.success('Attached your resume PDF.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Attach resume</div>
            <Button variant="secondary" className="w-full" onClick={scan}>
                Find resume upload
            </Button>
            <div className="flex flex-col gap-2">
                {fields.map((field) => (
                    <div key={field.id} className="rounded-md border p-2 text-sm">
                        <p>{field.label}</p>
                        <Button variant="secondary" size="sm" className="mt-2" onClick={() => attach(field.id)}>
                            Attach resume PDF
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
