import { cn } from '@/lib/utils';

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
                background: `conic-gradient(#5952d2 0 ${filled}%, #e5e7eb 0)`,
            }}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                className,
            )}
        >
            <div
                style={{ width: size - 14, height: size - 14 }}
                className="flex items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-gray-900"
            >
                {score ?? '—'}
            </div>
        </div>
    );
}
