import { useEffect, useState } from 'react';

const CANVAS_TOKEN = '--color-surface-canvas';

function hexToRgbTriplet(hex: string): string {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
}

/**
 * Client-only background experiment: overrides the canvas color token via
 * an inline style on <html> while this page is mounted, reverting on
 * unmount. Not persisted — for trying out colors, not for saving a theme.
 */
export function BackgroundColorPicker() {
    const [color, setColor] = useState('#faf6f0');

    useEffect(() => {
        return () => {
            document.documentElement.style.removeProperty(CANVAS_TOKEN);
        };
    }, []);

    function apply(hex: string) {
        setColor(hex);
        document.documentElement.style.setProperty(
            CANVAS_TOKEN,
            hexToRgbTriplet(hex),
        );
    }

    function reset() {
        setColor('#faf6f0');
        document.documentElement.style.removeProperty(CANVAS_TOKEN);
    }

    return (
        <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <input
                    type="color"
                    value={color}
                    onChange={(event) => apply(event.currentTarget.value)}
                    aria-label="Experiment with background color"
                    className="size-6 cursor-pointer rounded border border-border-default bg-transparent p-0"
                />
                Background
            </label>
            <button
                type="button"
                onClick={reset}
                className="text-xs text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
            >
                Reset
            </button>
        </div>
    );
}
