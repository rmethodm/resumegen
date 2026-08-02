import { cn } from '@/lib/utils';

function scoreLabel(score: number | null): string {
    if (score === null) {
        return 'No score yet';
    }
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
}

/**
 * Half-circle score gauge: a fixed red→yellow→green arc with a dot marking
 * the current score's position along it, plus the number and a band label
 * ("Very Good") inside the flat area under the arc.
 */
export function ScoreGauge({
    score,
    size = 180,
    className,
}: {
    score: number | null;
    size?: number;
    className?: string;
}) {
    const filled = score ?? 0;
    const stroke = size * 0.13;
    const radius = size / 2 - stroke / 2;
    const angleRad = ((180 - (filled / 100) * 180) * Math.PI) / 180;
    const dotX = size / 2 + radius * Math.cos(angleRad);
    const dotY = size / 2 - radius * Math.sin(angleRad);
    const dotSize = stroke * 0.7;

    return (
        <div
            className={cn('flex flex-col items-center', className)}
            style={{ width: size }}
        >
            <div
                role="img"
                aria-label={
                    score === null
                        ? 'No match score yet'
                        : `Match score ${score} of 100, ${scoreLabel(score)}`
                }
                className="relative"
                style={{ width: size, height: size / 2 }}
            >
                <div
                    className="absolute top-0 left-0 rounded-full"
                    style={{
                        width: size,
                        height: size,
                        background: `conic-gradient(from 270deg, #dc2626 0deg, #f59e0b 60deg, #fbbf24 100deg, #16a34a 180deg, transparent 180deg 360deg)`,
                    }}
                />
                <div
                    className="absolute rounded-full bg-white"
                    style={{
                        width: size - stroke * 2,
                        height: size - stroke * 2,
                        left: stroke,
                        top: stroke,
                    }}
                />
                <div
                    className="absolute rounded-full border-2 border-white bg-white shadow-md"
                    style={{
                        width: dotSize,
                        height: dotSize,
                        left: dotX - dotSize / 2,
                        top: dotY - dotSize / 2,
                    }}
                />
                <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-3xl font-extrabold text-gray-900"
                    style={{ fontSize: size * 0.17 }}
                >
                    {score ?? '—'}
                </span>
            </div>
            <span className="mt-1 text-xs font-medium text-gray-500">
                {scoreLabel(score)}
            </span>
        </div>
    );
}
