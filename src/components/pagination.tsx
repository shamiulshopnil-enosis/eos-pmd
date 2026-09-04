"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Client-side pagination for the big list tables (Projects, Milestones and the
 * per-project milestone list). The server still returns the full set — the
 * faceted filter counts and cross-page search/sort need it — but we only render
 * one page of rows at a time, which is what had made these pages slow as the
 * data grew.
 */
export const PAGE_SIZE = 25;

/**
 * Tracks the current page as a `first` row offset (PrimeReact's convention).
 *
 * `resetKey` is a string derived from the active filters / search / sort; when
 * it changes the view snaps back to page 1. The returned `first` is always
 * clamped to a real page, so a shrinking result set can't strand you on an
 * empty page. Both adjustments happen during render (no effects) per
 * https://react.dev/learn/you-might-not-need-an-effect.
 */
export function usePagination(total: number, resetKey: string, pageSize = PAGE_SIZE) {
  const [first, setFirst] = useState(0);
  const [seenKey, setSeenKey] = useState(resetKey);

  if (resetKey !== seenKey) {
    setSeenKey(resetKey);
    setFirst(0);
  }

  const maxFirst = total === 0 ? 0 : Math.floor((total - 1) / pageSize) * pageSize;
  const clamped = Math.min(first, maxFirst);
  if (clamped !== first) setFirst(clamped);

  return { first: clamped, setFirst, pageSize };
}

/** Slice `rows` to the active page. */
export function pageSlice<T>(rows: T[], first: number, pageSize = PAGE_SIZE): T[] {
  return rows.slice(first, first + pageSize);
}

export function pageWindow(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(count - 1, current + 1);
  if (from > 2) out.push("…");
  for (let p = from; p <= to; p++) out.push(p);
  if (to < count - 1) out.push("…");
  out.push(count);
  return out;
}

const NAV_BTN =
  "inline-flex h-7 min-w-7 items-center justify-center rounded-ledger border border-rule bg-panel px-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-band disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-panel";

/**
 * Just the ‹ 1 2 … 9 › controls. Renders nothing when everything fits on one
 * page. Shared by the inline control in `ResultBar` and the standalone `Pager`
 * below the table.
 */
export function PageNav({
  first,
  total,
  onChange,
  pageSize = PAGE_SIZE,
  label = "pagination",
}: {
  first: number;
  total: number;
  onChange: (first: number) => void;
  pageSize?: number;
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.floor(first / pageSize) + 1;
  const windowed = useMemo(() => pageWindow(current, pageCount), [current, pageCount]);

  if (pageCount <= 1) return null;

  const go = (page: number) => onChange((Math.min(Math.max(1, page), pageCount) - 1) * pageSize);

  return (
    <nav className="flex items-center gap-1" aria-label={label}>
      <button
        type="button"
        className={NAV_BTN}
        onClick={() => go(current - 1)}
        disabled={current <= 1}
        aria-label="Previous page"
      >
        <Icon name="chevron_left" className="text-[16px]" />
      </button>
      {windowed.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-ink-subtle">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${NAV_BTN} ${p === current ? "!border-link !bg-link !text-white" : ""}`}
            onClick={() => go(p)}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={NAV_BTN}
        onClick={() => go(current + 1)}
        disabled={current >= pageCount}
        aria-label="Next page"
      >
        <Icon name="chevron_right" className="text-[16px]" />
      </button>
    </nav>
  );
}

/** Standalone pager for below a table: page controls only (the range summary
 *  lives in `ResultBar` above the table). Nothing renders on a single page. */
export function Pager({
  first,
  total,
  onChange,
  pageSize = PAGE_SIZE,
  noun = "items",
}: {
  first: number;
  total: number;
  onChange: (first: number) => void;
  pageSize?: number;
  noun?: string;
}) {
  if (total <= pageSize) return null;
  return (
    <div className="mb-4 mt-3 flex justify-end">
      <PageNav first={first} total={total} onChange={onChange} pageSize={pageSize} label={`${noun} pagination`} />
    </div>
  );
}
