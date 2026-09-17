import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps, WorkstationLayoutMode } from '@/types';

/**
 * Reads the signed-in user's saved Workstation layout mode and returns a
 * setter that updates local state immediately and persists in the
 * background — same optimistic-update shape as the theme preference, but
 * this hook owns both the read and the write (the mode is chosen from
 * inside the Workstation, not a separate Profile form).
 */
export function useWorkstationLayout(): [
    WorkstationLayoutMode,
    (mode: WorkstationLayoutMode) => void,
] {
    const initial = usePage<PageProps>().props.auth.user.workstation_layout;
    const [mode, setMode] = useState<WorkstationLayoutMode>(initial);

    function change(next: WorkstationLayoutMode) {
        setMode(next);
        router.patch(
            route('workstation-layout.update'),
            { workstation_layout: next },
            { preserveScroll: true, preserveState: true },
        );
    }

    return [mode, change];
}
