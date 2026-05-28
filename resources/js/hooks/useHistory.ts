import { useRef, useState, useCallback } from 'react';

export interface ResumeSnapshot {
    name: string;
    template: string;
    contact: object;
    summary: string;
    experience: object[];
    education: object[];
    skills: string[];
    certifications: object[];
    font_sizes: object;
}

export function useHistory(_initial: ResumeSnapshot) {
    const past = useRef<ResumeSnapshot[]>([]);
    const future = useRef<ResumeSnapshot[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const pushSnapshot = useCallback((snapshot: ResumeSnapshot) => {
        past.current = [...past.current.slice(-49), snapshot];
        future.current = [];
        setCanUndo(true);
        setCanRedo(false);
    }, []);

    const undo = useCallback((current: ResumeSnapshot): ResumeSnapshot | null => {
        if (past.current.length === 0) return null;
        const prev = past.current[past.current.length - 1];
        past.current = past.current.slice(0, -1);
        future.current = [current, ...future.current.slice(0, 49)];
        setCanUndo(past.current.length > 0);
        setCanRedo(true);
        return prev;
    }, []);

    const redo = useCallback((current: ResumeSnapshot): ResumeSnapshot | null => {
        if (future.current.length === 0) return null;
        const next = future.current[0];
        future.current = future.current.slice(1);
        past.current = [...past.current.slice(-49), current];
        setCanUndo(true);
        setCanRedo(future.current.length > 0);
        return next;
    }, []);

    return { pushSnapshot, undo, redo, canUndo, canRedo };
}
