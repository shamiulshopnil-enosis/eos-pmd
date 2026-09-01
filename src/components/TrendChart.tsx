/** Average milestone rating over time. Plain inline SVG, no chart library. */
export function TrendChart({ points }: { points: { label: string; avgRating: number | null }[] }) {
  const hasData = points.some((p) => p.avgRating != null);
  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Not enough reviewed milestones yet to show a trend.
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 16, bottom: 28, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const min = 1;
  const max = 5;

  const step = points.length > 1 ? chartW / (points.length - 1) : 0;
  const yFor = (v: number) => padding.top + chartH - ((v - min) / (max - min)) * chartH;
  const xFor = (i: number) => padding.left + step * i;

  const known = points
    .map((p, i) => (p.avgRating != null ? { x: xFor(i), y: yFor(p.avgRating), v: p.avgRating } : null))
    .filter((p): p is { x: number; y: number; v: number } => p != null);

  const path = known.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Average milestone rating over time">
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yFor(v)}
            y2={yFor(v)}
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth={1}
          />
          <text x={4} y={yFor(v) + 4} className="fill-slate-400 text-[10px]">
            {v}
          </text>
        </g>
      ))}

      {path ? <path d={path} fill="none" className="stroke-blue-500" strokeWidth={2} /> : null}
      {known.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} className="fill-blue-500" />
      ))}

      {points.map((p, i) => (
        <text
          key={p.label}
          x={xFor(i)}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
