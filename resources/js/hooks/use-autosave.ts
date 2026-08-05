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
    const settledRef = useRef(false);
    const statusRef = useRef(status);
    statusRef.current = status;

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
        settledRef.current = false;

        router.put(urlRef.current, dataRef.current, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                settledRef.current = true;
                setStatus('saved');
                setConflict(false);
                setErrorMessage(null);
                onSuccessRef.current?.();
            },
            onError: (errors) => {
                settledRef.current = true;
                setStatus('error');
                if (errors.conflict) {
                    setConflict(true);
                    setErrorMessage(String(errors.conflict));
                } else {
                    const firstFieldError = Object.values(errors)[0];
                    setErrorMessage(
                        typeof firstFieldError === 'string' && firstFieldError !== ''
                            ? firstFieldError
                            : 'Save failed. Retry when ready.',
                    );
                }
            },
            onFinish: () => {
                // onSuccess/onError only cover 2xx and 422s. A 500, an expired
                // session redirect, or a dropped connection ends the visit
                // without either firing — this is the fallback that stops the
                // status from being stuck on "saving" forever.
                if (!settledRef.current) {
                    setStatus('error');
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

    // Auto-retry when coming back online while dirty/error — the offline
    // banner tells the user changes "will save when you reconnect", so this
    // has to actually retry rather than wait for the next keystroke.
    useEffect(() => {
        if (!offline && (statusRef.current === 'error' || statusRef.current === 'dirty')) {
            put();
        }
    }, [offline, put]);

    return {
        status,
        offline,
        conflict,
        errorMessage,
        retry: put,
        clearConflict: () => setConflict(false),
    };
}
