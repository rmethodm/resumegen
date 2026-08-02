import { useCallback, useMemo, useState } from 'react';

type History<T> = {
    past: T[];
    present: T;
    future: T[];
    /** When the top of `past` was pushed, for coalescing. */
    pushedAt: number;
};

/**
 * `useState` with undo/redo.
 *
 * Consecutive changes inside `coalesceMs` overwrite the top of the stack
 * instead of pushing, so typing a sentence is one undo step rather than forty.
 * A pause, or any change arriving after one, starts a new step.
 *
 * The stacks live in state rather than refs deliberately: React invokes state
 * updaters twice under StrictMode, and a ref mutated inside one would record
 * every edit twice.
 */
export function useHistory<T>(initial: T, coalesceMs = 600) {
    const [history, setHistory] = useState<History<T>>({
        past: [],
        present: initial,
        future: [],
        pushedAt: 0,
    });

    const set = useCallback(
        (next: T | ((current: T) => T)) => {
            // Read the clock out here — an updater has to be pure to survive
            // being called twice.
            const now = Date.now();

            setHistory((state) => {
                const value =
                    typeof next === 'function'
                        ? (next as (current: T) => T)(state.present)
                        : next;

                if (Object.is(value, state.present)) {
                    return state;
                }

                const coalesce = now - state.pushedAt <= coalesceMs;

                return {
                    past: coalesce
                        ? state.past
                        : [...state.past, state.present],
                    present: value,
                    // Any fresh edit invalidates the redo branch.
                    future: [],
                    pushedAt: coalesce ? state.pushedAt : now,
                };
            });
        },
        [coalesceMs],
    );

    const undo = useCallback(() => {
        setHistory((state) => {
            const previous = state.past.at(-1);

            if (previous === undefined) {
                return state;
            }

            return {
                past: state.past.slice(0, -1),
                present: previous,
                future: [...state.future, state.present],
                // Start the next edit on its own step rather than coalescing
                // it into the state we just restored.
                pushedAt: 0,
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((state) => {
            const next = state.future.at(-1);

            if (next === undefined) {
                return state;
            }

            return {
                past: [...state.past, state.present],
                present: next,
                future: state.future.slice(0, -1),
                pushedAt: 0,
            };
        });
    }, []);

    return useMemo(
        () => ({
            value: history.present,
            set,
            undo,
            redo,
            canUndo: history.past.length > 0,
            canRedo: history.future.length > 0,
        }),
        [history, set, undo, redo],
    );
}
