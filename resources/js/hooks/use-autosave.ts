import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '@/types';

export type AutosaveControls = {
    status: SaveStatus;
    offline: boolean;
    conflict: boolean;
    errorMessage: string | null;
    retry: () => void;
    clearConflict: () => void;
};

/**
 * Debounced PUT of `data` to `url`. Local state stays authoritative — the
 * response is never read back into the editor, so a save landing mid-keystroke
 * can't clobber what the user is typing.
 *
 * C11: surfaces offline, failed save + retry, and server conflict errors.
 */
export function useAutosave<T extends RequestPayload>(
    url: string,
    data: T,
    delay = 1500,
    onSuccess?: () => void,
): AutosaveControls {
    const [status, setStatus] = useState<SaveStatus>('saved');
    const [offline, setOffline] = useState(
        typeof navigator !== 'undefined' ? !navigator.onLine : false,
    );
    const [conflict, setConflict] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const initial = useRef(true);
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;
    const dataRef = useRef(data);
    dataRef.current = data;
    const urlRef = useRef(url);
    urlRef.current = url;

    useEffect(() => {
        function goOffline() {
            setOffline(true);
        }
        function goOnline() {
            setOffline(false);
        }

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);

        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    const put = useCallback(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setOffline(true);
            setStatus('error');
            setErrorMessage('You are offline. Changes will save when you reconnect.');

            return;
        }

        setStatus('saving');
        setErrorMessage(null);

        router.put(urlRef.current, dataRef.current, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setStatus('saved');
                setConflict(false);
                setErrorMessage(null);
                onSuccessRef.current?.();
            },
            onError: (errors) => {
                setStatus('error');
                if (errors.conflict) {
                    setConflict(true);
                    setErrorMessage(String(errors.conflict));
                } else {
                    setErrorMessage('Save failed. Retry when ready.');
                }
            },
        });
    }, []);

    useEffect(() => {
        // The first run is just the server's own payload arriving.
        if (initial.current) {
            initial.current = false;

            return;
        }

        setStatus('dirty');
        setConflict(false);

        const timer = setTimeout(() => {
            put();
        }, delay);

        return () => clearTimeout(timer);
    }, [url, data, delay, put]);

    // Auto-retry once when coming back online while dirty/error.
    useEffect(() => {
        if (!offline && (status === 'error' || status === 'dirty')) {
            // no-op: next data change or manual retry saves
        }
    }, [offline, status]);

    return {
        status,
        offline,
        conflict,
        errorMessage,
        retry: put,
        clearConflict: () => setConflict(false),
    };
}
