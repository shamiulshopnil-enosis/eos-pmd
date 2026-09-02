"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";

/** Average milestone rating over time — a PrimeReact <Chart> (line). */
export function TrendChart({ points }: { points: { label: string; avgRating: number | null }[] }) {
  const hasData = points.some((p) => p.avgRating != null);

  const [tokens, setTokens] = useState({ ink: "#23201a", muted: "#655d4b", rule: "#dbd2bd" });
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    setTokens({
      ink: s.getPropertyValue("--ink").trim() || "#23201a",
      muted: s.getPropertyValue("--ink-muted").trim() || "#655d4b",
      rule: s.getPropertyValue("--rule").trim() || "#dbd2bd",
    });
  }, []);

  const data = useMemo(
    () => ({
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: "Avg rating",
          data: points.map((p) => p.avgRating),
          borderColor: tokens.ink,
          backgroundColor: tokens.ink,
          borderWidth: 1.75,
          pointRadius: 2.5,
          pointStyle: "rect",
          tension: 0,
          spanGaps: true,
        },
      ],
    }),
    [points, tokens],
  );

  const options = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, color: tokens.muted, font: { family: "var(--font-roboto-mono)", size: 11 } },
          grid: { color: tokens.rule },
        },
        x: {
          ticks: { color: tokens.muted, font: { family: "var(--font-roboto-mono)", size: 11 } },
          grid: { display: false },
        },
      },
    }),
    [tokens],
  );

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-ink-muted">
        Not enough reviewed milestones yet to plot a trend.
      </div>
    );
  }

  return <Chart type="line" data={data} options={options} className="h-48 w-full" />;
}
