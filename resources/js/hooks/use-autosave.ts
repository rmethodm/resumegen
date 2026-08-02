import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '@/types';

/**
 * Debounced PUT of `data` to `url`. Local state stays authoritative — the
 * response is never read back into the editor, so a save landing mid-keystroke
 * can't clobber what the user is typing.
 */
export function useAutosave<T extends RequestPayload>(
    url: string,
    data: T,
    delay = 1500,
): SaveStatus {
    const [status, setStatus] = useState<SaveStatus>('saved');
    const initial = useRef(true);

    useEffect(() => {
        // The first run is just the server's own payload arriving.
        if (initial.current) {
            initial.current = false;

            return;
        }

        setStatus('dirty');

        const timer = setTimeout(() => {
            router.put(url, data, {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setStatus('saving'),
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('error'),
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [url, data, delay]);

    return status;
}
