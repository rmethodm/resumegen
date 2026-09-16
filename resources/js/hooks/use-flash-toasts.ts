import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';

type FlashPayload = { success?: string | null; error?: string | null };

function showFlashToasts(flash?: FlashPayload) {
    if (flash?.success) {
        toast.success(flash.success);
    }
    if (flash?.error) {
        toast.error(flash.error);
    }
}

export function useFlashToasts() {
    const { props } = usePage() as {
        props: { flash?: FlashPayload };
    };

    // Handle the flash already present on the initial full page load.
    useEffect(() => {
        showFlashToasts(props.flash);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle every subsequent Inertia navigation via the router's own
    // lifecycle event rather than diffing the flash prop value: two
    // consecutive identical flash messages (e.g. clicking "Save checkpoint"
    // twice, both flashing "Checkpoint saved.") would not re-trigger a toast
    // if we depended on the string value, since it wouldn't have "changed".
    useEffect(() => {
        return router.on('success', (event) => {
            showFlashToasts((event.detail.page.props as { flash?: FlashPayload }).flash);
        });
    }, []);
}
