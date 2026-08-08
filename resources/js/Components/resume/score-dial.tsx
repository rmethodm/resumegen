import { cn } from '@/lib/utils';

/** Ring fill by score band — matches dashboard version dots (green / amber / red). */
function scoreRingColor(score: number | null): string {
    if (score === null) {
        return 'rgb(var(--gray-300))';
    }
    if (score >= 70) {
        return 'rgb(var(--color-success-text))';
    }
    if (score >= 40) {
        return 'rgb(var(--color-warning-text))';
    }
    return 'rgb(var(--color-error-text))';
}

function scoreTrackColor(): string {
    return 'rgb(var(--gray-200))';
}

function scoreTextClass(score: number | null): string {
    if (score === null) {
        return 'text-text-tertiary';
    }
    if (score >= 70) {
        return 'text-success-text';
    }
    if (score >= 40) {
        return 'text-warning-text';
    }
    return 'text-error-text';
}

/**
 * The match score as a ring. A conic-gradient does the whole arc — no SVG, no
 * chart library.
 */
export function ScoreDial({
    score,
    size = 52,
    className,
}: {
    score: number | null;
    size?: number;
    className?: string;
}) {
    const filled = score ?? 0;
    const ring = scoreRingColor(score);

    return (
        <div
            role="img"
            aria-label={
                score === null
                    ? 'No match score yet'
                    : `Match score ${score} of 100`
            }
            style={{
                width: size,
                height: size,
                background: `conic-gradient(${ring} 0 ${filled}%, ${scoreTrackColor()} 0)`,
            }}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                className,
            )}
        >
            <div
                style={{ width: size - 14, height: size - 14 }}
                className={cn(
                    'flex items-center justify-center rounded-full bg-surface-card text-[13px] font-extrabold tabular-nums',
                    scoreTextClass(score),
                )}
            >
                {score ?? '—'}
            </div>
        </div>
    );
}
