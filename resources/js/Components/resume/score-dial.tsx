import { cn } from '@/lib/utils';

/** Ring fill by score band — matches dashboard version dots (green / amber / red). */
function scoreRingColor(score: number | null): string {
    if (score === null) {
        return '#d1d5db'; // gray-300
    }
    if (score >= 70) {
        return '#10b981'; // emerald-500
    }
    if (score >= 40) {
        return '#fbbf24'; // amber-400
    }
    return '#ef4444'; // red-500
}

function scoreTextClass(score: number | null): string {
    if (score === null) {
        return 'text-gray-400';
    }
    if (score >= 70) {
        return 'text-emerald-600';
    }
    if (score >= 40) {
        return 'text-amber-600';
    }
    return 'text-red-600';
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
                background: `conic-gradient(${ring} 0 ${filled}%, #e5e7eb 0)`,
            }}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                className,
            )}
        >
            <div
                style={{ width: size - 14, height: size - 14 }}
                className={cn(
                    'flex items-center justify-center rounded-full bg-white text-[13px] font-extrabold',
                    scoreTextClass(score),
                )}
            >
                {score ?? '—'}
            </div>
        </div>
    );
}
