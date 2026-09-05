import { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';

/**
 * In-app replacement for `window.confirm()` on destructive actions — a native
 * confirm is a freeform dialog users click through without reading, and it
 * can't be styled, closed with the app's own Escape/backdrop conventions, or
 * show a busy state while the delete request is in flight.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Delete',
    confirmVariant = 'destructive',
    onConfirm,
    onClose,
}: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    /** Only genuinely destructive (data-loss) actions should read as danger-red. */
    confirmVariant?: 'destructive' | 'default';
    onConfirm: () => void;
    onClose: () => void;
}) {
    const [confirming, setConfirming] = useState(false);

    // The caller may close this dialog itself on success (no onClose call) —
    // reset here too, or a second open after that would start pre-disabled.
    useEffect(() => {
        if (!open) {
            setConfirming(false);
        }
    }, [open]);

    function handleConfirm() {
        setConfirming(true);
        onConfirm();
    }

    return (
        <Modal
            show={open}
            maxWidth="sm"
            onClose={() => {
                setConfirming(false);
                onClose();
            }}
            title={title}
            description={description}
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={confirming}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={confirmVariant}
                        size="sm"
                        onClick={handleConfirm}
                        disabled={confirming}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            }
        />
    );
}
