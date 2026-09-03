"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import type { Chart as ChartJS, Plugin } from "chart.js";
import { AT_RISK_RATING_THRESHOLD, SATISFIED_RATING_THRESHOLD } from "@/lib/constants";
import type { RatingTrendPoint } from "@/lib/derived";

type Tokens = {
  ink: string;
  muted: string;
  subtle: string;
  rule: string;
  panel: string;
  link: string;
  linkStrong: string;
  good: string;
  warn: string;
  bad: string;
};

const FALLBACK: Tokens = {
  ink: "#1f2733",
  muted: "#5e6c84",
  subtle: "#8993a4",
  rule: "#e4e7ec",
  panel: "#ffffff",
  link: "#22488f",
  linkStrong: "#17356b",
  good: "#216e4e",
  warn: "#7f5f01",
  bad: "#ae2e24",
};

function readTokens(): Tokens {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const get = (name: string, fb: string) => s.getPropertyValue(name).trim() || fb;
  return {
    ink: get("--ink", FALLBACK.ink),
    muted: get("--ink-muted", FALLBACK.muted),
    subtle: get("--ink-subtle", FALLBACK.subtle),
    rule: get("--rule", FALLBACK.rule),
    panel: get("--panel", FALLBACK.panel),
    link: get("--link", FALLBACK.link),
    linkStrong: get("--link-strong", FALLBACK.linkStrong),
    good: get("--rag-good", FALLBACK.good),
    warn: get("--rag-warn", FALLBACK.warn),
    bad: get("--rag-bad", FALLBACK.bad),
  };
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1));
const MONO = "var(--font-roboto-mono), ui-monospace, monospace";

/**
 * Milestone rating over time. Reads as an answer, not a squiggle:
 *  - headline running-average with its move over the window,
 *  - green / amber / red rating zones with the Satisfied 4.0 and At-risk 3.0
 *    lines drawn in, so a number on the scale means something,
 *  - the noisy monthly average as an accent line, the stable running average
 *    as a dotted line beside it,
 *  - review volume per month as faint bars, so a one-review spike can't be
 *    mistaken for a trend.
 */
export function TrendChart({ points }: { points: RatingTrendPoint[] }) {
  const [t, setT] = useState<Tokens>(() => readTokens());
  useEffect(() => {
    const obs = new MutationObserver(() => setT(readTokens()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  const populated = points.filter((p) => p.avgRating != null);
  const totalReviews = points.reduce((sum, p) => sum + p.count, 0);
  const maxCount = Math.max(1, ...points.map((p) => p.count));
  const busiest = points.reduce<RatingTrendPoint | null>(
    (best, p) => (p.count > (best?.count ?? 0) ? p : best),
    null,
  );
  const firstPop = populated[0];
  const lastPop = populated[populated.length - 1];
  const current = lastPop?.cumulativeAvg ?? null;
  const delta =
    firstPop && lastPop && firstPop !== lastPop && firstPop.cumulativeAvg != null && lastPop.cumulativeAvg != null
      ? lastPop.cumulativeAvg - firstPop.cumulativeAvg
      : null;

  const zone = (v: number | null) =>
    v == null ? "none" : v >= SATISFIED_RATING_THRESHOLD ? "good" : v >= AT_RISK_RATING_THRESHOLD ? "warn" : "bad";
  const currentZone = zone(current);
  const headTone =
    currentZone === "good" ? "text-rag-good" : currentZone === "bad" ? "text-rag-bad" : "text-ink";

  const data = useMemo(
    () => ({
      labels: points.map((p) => p.label),
      datasets: [
        {
          type: "line" as const,
          label: "Monthly average",
          data: points.map((p) => p.avgRating),
          borderColor: t.link,
          borderWidth: 2.5,
          pointRadius: points.map((p) => (p.avgRating == null ? 0 : 4)),
          pointHoverRadius: 6,
          pointBackgroundColor: t.link,
          pointBorderColor: t.panel,
          pointBorderWidth: 2,
          tension: 0,
          spanGaps: true,
          fill: "origin" as const,
          backgroundColor: (ctx: { chart: ChartJS }) => {
            const { ctx: c, chartArea } = ctx.chart;
            if (!chartArea) return hexA(t.link, 0.1);
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, hexA(t.link, 0.18));
            g.addColorStop(1, hexA(t.link, 0));
            return g;
          },
          segment: {
            // dash the segments that only exist by bridging an empty month
            borderDash: (c: { p0: { skip?: boolean }; p1: { skip?: boolean } }) =>
              c.p0.skip || c.p1.skip ? [4, 4] : undefined,
            borderColor: (c: { p0: { skip?: boolean }; p1: { skip?: boolean } }) =>
              c.p0.skip || c.p1.skip ? hexA(t.link, 0.45) : t.link,
          },
          order: 1,
        },
        {
          type: "line" as const,
          label: "Running average",
          data: points.map((p) => p.cumulativeAvg),
          borderColor: t.muted,
          borderWidth: 1.5,
          borderDash: [2, 3],
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.35,
          spanGaps: true,
          fill: false,
          order: 2,
        },
        {
          type: "bar" as const,
          label: "Reviews",
          yAxisID: "y1",
          data: points.map((p) => (p.count > 0 ? p.count : null)),
          backgroundColor: hexA(t.link, 0.14),
          hoverBackgroundColor: hexA(t.link, 0.24),
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
          order: 0,
        },
      ],
    }),
    [points, t],
  );

  const zonesPlugin = useMemo<Plugin<"line">>(
    () => ({
      id: "eos-zones",
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const yPx = (v: number) => scales.y.getPixelForValue(v);
        const { left, right } = chartArea;
        const w = right - left;

        ctx.save();
        // rating zones
        const band = (from: number, to: number, color: string, alpha: number) => {
          const yTop = yPx(to);
          ctx.fillStyle = hexA(color, alpha);
          ctx.fillRect(left, yTop, w, yPx(from) - yTop);
        };
        band(SATISFIED_RATING_THRESHOLD, 5, t.good, 0.12);
        band(AT_RISK_RATING_THRESHOLD, SATISFIED_RATING_THRESHOLD, t.warn, 0.1);
        band(1, AT_RISK_RATING_THRESHOLD, t.bad, 0.09);

        // threshold lines + left-pinned labels
        const rule = (v: number, color: string, text: string) => {
          const y = yPx(v);
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = hexA(color, 0.6);
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = `600 11px ${MONO}`;
          ctx.fillStyle = hexA(color, 0.95);
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          ctx.fillText(text, left + 2, y - 3);
        };
        rule(SATISFIED_RATING_THRESHOLD, t.good, `Satisfied ${SATISFIED_RATING_THRESHOLD.toFixed(1)}`);
        rule(AT_RISK_RATING_THRESHOLD, t.bad, `At-risk ${AT_RISK_RATING_THRESHOLD.toFixed(1)}`);
        ctx.restore();
      },
    }),
    [t],
  );

  const valueLabelsPlugin = useMemo<Plugin<"line">>(
    () => ({
      id: "eos-value-labels",
      afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        if (!meta || meta.hidden) return;
        const { ctx } = chart;
        ctx.save();
        ctx.font = `700 11px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        meta.data.forEach((pt, i) => {
          const p = points[i];
          if (p?.avgRating == null) return;
          const z = zone(p.avgRating);
          ctx.fillStyle = z === "good" ? t.good : z === "bad" ? t.bad : t.linkStrong;
          ctx.fillText(p.avgRating.toFixed(1), pt.x, pt.y - 9);
        });
        ctx.restore();
      },
    }),
    [points, t],
  );

  const options = useMemo(
    () => ({
      maintainAspectRatio: false,
      layout: { padding: { top: 18, right: 6 } },
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.ink,
          padding: 10,
          titleFont: { size: 12, weight: "600" as const },
          bodyFont: { size: 12 },
          bodySpacing: 4,
          displayColors: false,
          itemSort: (a: { datasetIndex: number }, b: { datasetIndex: number }) =>
            a.datasetIndex - b.datasetIndex,
          callbacks: {
            title: (items: { dataIndex: number }[]) => points[items[0].dataIndex]?.monthLabel ?? "",
            label: (item: { datasetIndex: number; dataIndex: number }) => {
              const p = points[item.dataIndex];
              if (!p) return "";
              if (item.datasetIndex === 0)
                return p.avgRating == null ? "No reviews this month" : `Monthly avg ${p.avgRating.toFixed(1)}`;
              if (item.datasetIndex === 1)
                return p.cumulativeAvg == null ? "" : `Running avg ${p.cumulativeAvg.toFixed(1)}`;
              return `${p.count} review${p.count === 1 ? "" : "s"}`;
            },
          },
        },
      },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, color: t.subtle, font: { family: MONO, size: 11 } },
          grid: { color: hexA(t.rule, 0.6), drawTicks: false },
          border: { display: false },
        },
        y1: {
          display: false,
          min: 0,
          max: maxCount * 4,
          grid: { display: false },
        },
        x: {
          ticks: { color: t.subtle, font: { family: MONO, size: 11 } },
          grid: { display: false },
          border: { color: t.rule },
        },
      },
    }),
    [points, t, maxCount],
  );

  if (populated.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-ink-muted">
        No reviewed milestones yet — the trend appears once clients start rating.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1 pb-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-2xl font-semibold tabular-nums ${headTone}`}>{fmt(current)}</span>
            {delta != null && Math.abs(delta) >= 0.05 ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  delta > 0 ? "text-rag-good" : "text-rag-bad"
                }`}
              >
                <i className={`pi ${delta > 0 ? "pi-arrow-up-right" : "pi-arrow-down-right"} text-[11px]`} />
                {delta > 0 ? "+" : "−"}
                {Math.abs(delta).toFixed(1)}
              </span>
            ) : (
              <span className="text-xs font-medium text-ink-subtle">flat</span>
            )}
            <span
              className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                currentZone === "good"
                  ? "bg-[var(--rag-good-bg,rgba(33,110,78,0.12))] text-rag-good"
                  : currentZone === "bad"
                    ? "bg-[var(--rag-bad-bg,rgba(174,46,36,0.12))] text-rag-bad"
                    : "bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))] text-rag-warn"
              }`}
            >
              {currentZone === "good" ? "Satisfied" : currentZone === "bad" ? "At risk" : "Watch"}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">
            Running client rating{firstPop && delta != null ? ` · since ${firstPop.label}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold tabular-nums text-ink">{totalReviews}</div>
          <div className="text-xs text-ink-muted">
            review{totalReviews === 1 ? "" : "s"} · {points.length} mo
            {busiest && busiest.count > 0 ? ` · peak ${busiest.count} in ${busiest.label}` : ""}
          </div>
        </div>
      </div>

      <Chart
        type="line"
        data={data}
        options={options}
        plugins={[zonesPlugin, valueLabelsPlugin]}
        className="h-52 w-full"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 px-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: "var(--link)" }} /> Monthly avg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-ink-muted" /> Running avg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: "color-mix(in srgb, var(--link) 16%, transparent)" }}
          />
          Reviews/mo
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-good" /> ≥{SATISFIED_RATING_THRESHOLD.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-warn" /> {AT_RISK_RATING_THRESHOLD.toFixed(1)}–
            {SATISFIED_RATING_THRESHOLD.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-bad" /> &lt;{AT_RISK_RATING_THRESHOLD.toFixed(1)}
          </span>
        </span>
      </div>
    </div>
  );
}

/** `#rrggbb` (or a CSS color that resolves to one) + alpha → `rgba()`. Falls
 *  back to the input untouched for non-hex values so it degrades gracefully. */
function hexA(color: string, alpha: number): string {
  const hex = color.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(hex) || /^#?([0-9a-f]{3})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
