type SeriesPoint = { date: string; count: number; cost_cents: number };
type BarRow = { label: string; count: number; cost_cents: number };

const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

// Inline-SVG line chart of daily counts. No chart dependency.
export function LineChart({ series, height = 120 }: { series: SeriesPoint[]; height?: number }) {
    if (series.length === 0) return <p className="text-sm text-gray-400">No data for this period.</p>;
    const w = 600;
    const max = Math.max(1, ...series.map((p) => p.count));
    const step = series.length > 1 ? w / (series.length - 1) : 0;
    const pts = series
        .map((p, i) => `${i * step},${height - (p.count / max) * height}`)
        .join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
            <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={pts} />
        </svg>
    );
}

// Horizontal bars for a grouped breakdown.
export function BarList({ rows, showCost = false }: { rows: BarRow[]; showCost?: boolean }) {
    if (rows.length === 0) return <p className="text-sm text-gray-400">No data.</p>;
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <ul className="space-y-2">
            {rows.map((r) => (
                <li key={r.label}>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>{r.label}</span>
                        <span>{r.count}{showCost ? ` · ${fmtCents(r.cost_cents)}` : ''}</span>
                    </div>
                    <div className="h-2 rounded bg-gray-100">
                        <div className="h-2 rounded bg-indigo-500" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// KPI stat card.
export function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        </div>
    );
}

export { fmtCents };
