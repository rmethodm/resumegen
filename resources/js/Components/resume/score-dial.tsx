import { cn } from '@/lib/utils';
import {
    scoreBand,
    scoreBandRingHex,
    scoreBandTextClass,
} from '@/lib/score-band';

/**
 * The match score as a ring. A conic-gradient does the whole arc — no SVG, no
 * chart library. Band colors come from score-band (same source as dashboard dots).
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
    const band = scoreBand(score);
    const ring = scoreBandRingHex[band];

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
                    'flex items-center justify-center rounded-full bg-white text-sm font-extrabold tabular-nums',
                    scoreBandTextClass[band],
                )}
            >
                {score ?? '—'}
            </div>
        </div>
    );
}
