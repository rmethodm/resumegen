import Typo from 'typo-js';
import { useCallback, useEffect, useRef, useState } from 'react';

let typoInstance: Typo | null = null;
let loadingPromise: Promise<Typo> | null = null;

async function getTypo(): Promise<Typo> {
    if (typoInstance) return typoInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const [aff, dic] = await Promise.all([
            fetch('/dictionaries/en_US.aff').then(r => r.text()),
            fetch('/dictionaries/en_US.dic').then(r => r.text()),
        ]);
        typoInstance = new Typo('en_US', aff, dic, { platform: 'any' } as any);
        return typoInstance;
    })().catch(e => {
        loadingPromise = null;
        throw e;
    });

    return loadingPromise;
}

export function useSpellCheck(text: string, debounceMs = 300): string[] {
    const [misspelled, setMisspelled] = useState<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const check = useCallback(async (value: string) => {
        try {
            const typo = await getTypo();
            const words = value.match(/\b[a-zA-Z']{2,}\b/g) ?? [];
            const bad = words.filter(w => !typo.check(w));
            setMisspelled([...new Set(bad)]);
        } catch {
            // dictionary unavailable — fail silently
        }
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => check(text), debounceMs);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [text, debounceMs, check]);

    return misspelled;
}
