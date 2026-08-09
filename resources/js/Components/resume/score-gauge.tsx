import { cn } from '@/lib/utils';

/**
 * Full-circle score gauge: a ring showing score/100 as a proportion of the
 * circle's circumference, with the number centered inside.
 */
export function ScoreGauge({
    score,
    size = 140,
    className,
}: {
    score: number | null;
    size?: number;
    className?: string;
}) {
    const filled = score ?? 0;
    const stroke = size * 0.1;
    const radius = size / 2 - stroke / 2;
    const circumference = 2 * Math.PI * radius;
    const dash = (Math.max(0, Math.min(100, filled)) / 100) * circumference;

    return (
        <div
            role="img"
            aria-label={
                score === null ? 'No score yet' : `Resume score ${score} of 100`
            }
            className={cn('relative inline-flex', className)}
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgb(var(--color-surface-sunken))"
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgb(var(--color-accent-bg))"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="font-extrabold text-text-primary"
                    style={{ fontSize: size * 0.24 }}
                >
                    {score ?? '—'}
                </span>
                <span className="text-xs font-medium text-text-tertiary">
                    / 100
                </span>
            </div>
        </div>
    );
}
