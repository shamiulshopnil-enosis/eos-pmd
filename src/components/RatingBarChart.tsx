"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import type { Plugin } from "chart.js";
import type { RatingDistributionBar } from "@/lib/derived";

type Tokens = { ink: string; subtle: string; rule: string; good: string; warn: string; bad: string };
const FALLBACK: Tokens = {
  ink: "#1f2733",
  subtle: "#8993a4",
  rule: "#e4e7ec",
  good: "#216e4e",
  warn: "#7f5f01",
  bad: "#ae2e24",
};
const MONO = "var(--font-roboto-mono), ui-monospace, monospace";

function readTokens(): Tokens {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const g = (n: string, fb: string) => s.getPropertyValue(n).trim() || fb;
  return {
    ink: g("--ink", FALLBACK.ink),
    subtle: g("--ink-subtle", FALLBACK.subtle),
    rule: g("--rule", FALLBACK.rule),
    good: g("--rag-good", FALLBACK.good),
    warn: g("--rag-warn", FALLBACK.warn),
    bad: g("--rag-bad", FALLBACK.bad),
  };
}

function hexA(color: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim()) || /^#?([0-9a-f]{3})$/i.exec(color.trim());
  if (!m) return color;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const toneColor = (tone: RatingDistributionBar["tone"], t: Tokens) =>
  tone === "good" ? t.good : tone === "warn" ? t.warn : t.bad;

/** Milestone reviews bucketed by rating band — a small coloured bar chart. */
export function RatingBarChart({ bars }: { bars: RatingDistributionBar[] }) {
  const [t, setT] = useState<Tokens>(() => readTokens());
  useEffect(() => {
    const obs = new MutationObserver(() => setT(readTokens()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  const total = bars.reduce((s, b) => s + b.count, 0);

  const data = useMemo(
    () => ({
      labels: bars.map((b) => b.label),
      datasets: [
        {
          label: "Reviews",
          data: bars.map((b) => b.count),
          backgroundColor: bars.map((b) => hexA(toneColor(b.tone, t), 0.82)),
          hoverBackgroundColor: bars.map((b) => toneColor(b.tone, t)),
          borderRadius: 3,
          borderSkipped: false,
          maxBarThickness: 46,
          categoryPercentage: 0.66,
        },
      ],
    }),
    [bars, t],
  );

  const valueLabels = useMemo<Plugin<"bar">>(
    () => ({
      id: "eos-bar-values",
      afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        const { ctx } = chart;
        ctx.save();
        ctx.font = `700 11px ${MONO}`;
        ctx.fillStyle = t.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        meta.data.forEach((el, i) => {
          const v = bars[i]?.count ?? 0;
          if (v === 0) return;
          ctx.fillText(String(v), el.x, el.y - 5);
        });
        ctx.restore();
      },
    }),
    [bars, t],
  );

  const options = useMemo(
    () => ({
      maintainAspectRatio: false,
      layout: { padding: { top: 16 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.ink,
          padding: 9,
          displayColors: false,
          callbacks: {
            label: (item: { dataIndex: number; raw: unknown }) => {
              const n = Number(item.raw) || 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return `${n} review${n === 1 ? "" : "s"} · ${pct}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: t.subtle, font: { family: MONO, size: 11 } },
          grid: { color: hexA(t.rule, 0.6), drawTicks: false },
          border: { display: false },
        },
        x: {
          ticks: { color: t.subtle, font: { family: MONO, size: 11 } },
          grid: { display: false },
          border: { color: t.rule },
        },
      },
    }),
    [t, total],
  );

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-ink-muted">
        No milestone reviews yet.
      </div>
    );
  }

  return <Chart type="bar" data={data} options={options} plugins={[valueLabels]} className="h-44 w-full" />;
}
