"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";

/* ------------------------------------------------------------------ *
 * Faceted filtering for the Projects and Milestones lists, modelled
 * on the Enosis "Explore Projects" pattern: a keyword field plus a few
 * quick multi-select popovers, a "More filters" right drawer with every
 * category, live result counts per option, removable active-filter
 * chips, and a separate "Sort by". Everything applies instantly.
 * ------------------------------------------------------------------ */

export type FilterOption = { value: string; label: string };
export type FilterFacet = { key: string; label: string; options: FilterOption[]; searchable?: boolean };

export type Selected = Record<string, string[]>;

/** Empty selection object for a facet list. */
export function emptySelection(facets: FilterFacet[]): Selected {
  return Object.fromEntries(facets.map((f) => [f.key, [] as string[]]));
}

export function toggleValue(sel: Selected, key: string, value: string): Selected {
  const cur = sel[key] ?? [];
  return { ...sel, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
}

export function selectionCount(sel: Selected): number {
  return Object.values(sel).reduce((n, arr) => n + arr.length, 0);
}

/**
 * Faceted option counts. For each facet, count matching rows while
 * ignoring that facet's own selection (so counts show what each option
 * would add), respecting the keyword and every other active filter.
 */
export function facetCounts<Row>(
  rows: Row[],
  facets: FilterFacet[],
  selected: Selected,
  /** does this row pass the model, given a selection that may omit one facet? */
  test: (row: Row, sel: Selected) => boolean,
  /** the row's value(s) for a facet key */
  accessor: (row: Row, key: string) => string | string[] | null | undefined,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const facet of facets) {
    const others: Selected = { ...selected, [facet.key]: [] };
    const pool = rows.filter((r) => test(r, others));
    const counts: Record<string, number> = {};
    for (const opt of facet.options) counts[opt.value] = 0;
    for (const r of pool) {
      const v = accessor(r, facet.key);
      const vals = Array.isArray(v) ? v : v == null ? [] : [v];
      for (const val of vals) if (val in counts) counts[val] += 1;
    }
    out[facet.key] = counts;
  }
  return out;
}

/* --- Searchable checkbox list (one facet) ----------------------- */

export function CheckboxList({
  facet,
  selected,
  counts,
  onToggle,
}: {
  facet: FilterFacet;
  selected: string[];
  counts?: Record<string, number>;
  onToggle: (value: string) => void;
}) {
  const [q, setQ] = useState("");
  const opts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? facet.options.filter((o) => o.label.toLowerCase().includes(needle)) : facet.options;
  }, [facet.options, q]);

  return (
    <div className="eos-checklist">
      {facet.searchable && facet.options.length > 8 ? (
        <IconField iconPosition="left" className="mb-2 block">
          <InputIcon className="pi pi-search" />
          <InputText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${facet.label.toLowerCase()}`}
            className="w-full"
          />
        </IconField>
      ) : null}
      <ul className="eos-checklist-items">
        {opts.length === 0 ? (
          <li className="px-1 py-2 text-xs text-ink-muted">No matches</li>
        ) : (
          opts.map((o) => {
            const id = `${facet.key}-${o.value}`;
            const n = counts?.[o.value];
            return (
              <li key={o.value}>
                <label htmlFor={id} className="eos-checklist-row">
                  <Checkbox inputId={id} checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {typeof n === "number" ? (
                    <span className={`text-xs tabular-nums ${n === 0 ? "text-ink-subtle" : "text-ink-muted"}`}>{n}</span>
                  ) : null}
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

/* --- Quick-bar popover for one facet -------------------------- */

function QuickFacet({
  facet,
  selected,
  counts,
  onToggle,
  onClear,
}: {
  facet: FilterFacet;
  selected: string[];
  counts?: Record<string, number>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const op = useRef<OverlayPanel>(null);
  const n = selected.length;
  return (
    <>
      <Button
        type="button"
        outlined
        severity="secondary"
        className={`eos-filter-trigger ${n > 0 ? "is-active" : ""}`}
        onClick={(e) => op.current?.toggle(e)}
      >
        <span>{facet.label}</span>
        {n > 0 ? <span className="eos-filter-count">{n}</span> : null}
        <i className="pi pi-chevron-down ml-1.5 text-[11px]" />
      </Button>
      <OverlayPanel ref={op} className="eos-overlay eos-filter-pop">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink">{facet.label}</span>
          {n > 0 ? (
            <button type="button" className="text-xs font-medium text-link hover:underline" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
        <CheckboxList facet={facet} selected={selected} counts={counts} onToggle={onToggle} />
      </OverlayPanel>
    </>
  );
}

/* --- Active-filter chips ------------------------------------- */

export type ExtraChip = { id: string; label: string; onRemove: () => void };

function Chips({
  facets,
  selected,
  counts,
  onToggle,
  extra,
  onClearAll,
}: {
  facets: FilterFacet[];
  selected: Selected;
  counts: Record<string, Record<string, number>>;
  onToggle: (key: string, value: string) => void;
  extra: ExtraChip[];
  onClearAll: () => void;
}) {
  const facetChips = facets.flatMap((f) =>
    (selected[f.key] ?? []).map((v) => ({
      id: `${f.key}:${v}`,
      label: `${f.label}: ${f.options.find((o) => o.value === v)?.label ?? v}`,
      onRemove: () => onToggle(f.key, v),
    })),
  );
  void counts;
  const all = [...facetChips, ...extra];
  if (all.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {all.map((c) => (
        <span key={c.id} className="eos-chip">
          {c.label}
          <button type="button" aria-label={`Remove ${c.label}`} onClick={c.onRemove} className="eos-chip-x">
            <i className="pi pi-times text-[11px]" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 text-xs font-medium text-link hover:underline">
        Clear all
      </button>
    </div>
  );
}

/* --- The toolbar (search + quick facets + more + chips) ------- */

export function FilterToolbar({
  q,
  onQChange,
  searchPlaceholder = "Search…",
  facets,
  inlineKeys,
  selected,
  onToggle,
  onClearFacet,
  onClearAll,
  counts,
  drawerExtra,
  extraChips = [],
  extraActiveCount = 0,
  resultCount,
  totalCount,
}: {
  q: string;
  onQChange: (v: string) => void;
  searchPlaceholder?: string;
  facets: FilterFacet[];
  inlineKeys: string[];
  selected: Selected;
  onToggle: (key: string, value: string) => void;
  onClearFacet: (key: string) => void;
  onClearAll: () => void;
  counts: Record<string, Record<string, number>>;
  drawerExtra?: ReactNode;
  extraChips?: ExtraChip[];
  extraActiveCount?: number;
  resultCount: number;
  totalCount: number;
}) {
  const [drawer, setDrawer] = useState(false);
  const inline = facets.filter((f) => inlineKeys.includes(f.key));
  const activeTotal = selectionCount(selected) + extraActiveCount;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <IconField iconPosition="left" className="min-w-[14rem] flex-1 sm:max-w-sm">
          <InputIcon className="pi pi-search" />
          <InputText
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full"
          />
        </IconField>

        {inline.map((f) => (
          <QuickFacet
            key={f.key}
            facet={f}
            selected={selected[f.key] ?? []}
            counts={counts[f.key]}
            onToggle={(v) => onToggle(f.key, v)}
            onClear={() => onClearFacet(f.key)}
          />
        ))}

        <Button
          type="button"
          outlined
          severity="secondary"
          className={`eos-filter-trigger ${activeTotal > 0 ? "is-active" : ""}`}
          icon="pi pi-sliders-h"
          onClick={() => setDrawer(true)}
        >
          <span className="ml-1.5">More filters</span>
          {activeTotal > 0 ? <span className="eos-filter-count">{activeTotal}</span> : null}
        </Button>
      </div>

      <Chips
        facets={facets}
        selected={selected}
        counts={counts}
        onToggle={onToggle}
        extra={extraChips}
        onClearAll={onClearAll}
      />

      <Sidebar
        visible={drawer}
        position="right"
        onHide={() => setDrawer(false)}
        className="eos-sidebar eos-filter-drawer w-full sm:w-[26rem]"
        header={
          <div className="flex w-full items-center justify-between gap-4 pr-2">
            <span className="text-base font-semibold text-ink">All filters</span>
            {activeTotal > 0 ? (
              <button type="button" onClick={onClearAll} className="text-sm font-medium text-link hover:underline">
                Clear all
              </button>
            ) : null}
          </div>
        }
      >
        <div className="eos-filter-drawer-body">
          {facets.map((f) => (
            <details key={f.key} className="eos-filter-acc" open={(selected[f.key]?.length ?? 0) > 0}>
              <summary className="eos-filter-acc-summary">
                <span>{f.label}</span>
                <span className="flex items-center gap-2">
                  {(selected[f.key]?.length ?? 0) > 0 ? (
                    <span className="eos-filter-count">{selected[f.key]!.length}</span>
                  ) : null}
                  <i className="pi pi-chevron-down text-[11px] transition-transform" />
                </span>
              </summary>
              <div className="pb-3 pt-1">
                <CheckboxList
                  facet={f}
                  selected={selected[f.key] ?? []}
                  counts={counts[f.key]}
                  onToggle={(v) => onToggle(f.key, v)}
                />
              </div>
            </details>
          ))}
          {drawerExtra ? <div className="eos-filter-acc-extra">{drawerExtra}</div> : null}
        </div>
        <div className="eos-filter-drawer-foot">
          <Button
            type="button"
            className="w-full"
            label={
              resultCount === totalCount
                ? `Done${activeTotal > 0 ? ` · ${totalCount} shown` : ""}`
                : `Show ${resultCount} of ${totalCount}`
            }
            onClick={() => setDrawer(false)}
          />
        </div>
      </Sidebar>
    </div>
  );
}

/* --- Result count + Sort by --------------------------------- */

export type SortState<K extends string = string> = { key: K; dir: "asc" | "desc" };

export function ResultBar<K extends string>({
  count,
  total,
  noun,
  sort,
  onSort,
  sortOptions,
}: {
  count: number;
  total: number;
  noun: string;
  sort: SortState<K>;
  onSort: (s: SortState<K>) => void;
  sortOptions: { label: string; key: K; dir: "asc" | "desc" }[];
}) {
  const value = `${sort.key}:${sort.dir}`;
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="text-sm text-ink-muted">
        Showing <span className="font-semibold text-ink tabular-nums">{count}</span>
        {count !== total ? <> of <span className="tabular-nums">{total}</span></> : null} {noun}
      </span>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Sort by
        <Dropdown
          value={value}
          onChange={(e) => {
            const found = sortOptions.find((o) => `${o.key}:${o.dir}` === e.value);
            if (found) onSort({ key: found.key, dir: found.dir });
          }}
          options={sortOptions.map((o) => ({ value: `${o.key}:${o.dir}`, label: o.label }))}
          className="eos-sort-select"
        />
      </label>
    </div>
  );
}

/* --- Date range (drawer only) ------------------------------ */

const iso = (d: Date | null | undefined) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";

export function FilterDateRange({
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-ink">{label}</div>
      <div className="flex items-center gap-1.5">
        <Calendar
          value={from ? new Date(from) : null}
          onChange={(e) => onFrom(iso(e.value as Date | null))}
          dateFormat="yy-mm-dd"
          showButtonBar
          placeholder="from"
          className="flex-1"
        />
        <span className="text-ink-muted">–</span>
        <Calendar
          value={to ? new Date(to) : null}
          onChange={(e) => onTo(iso(e.value as Date | null))}
          dateFormat="yy-mm-dd"
          showButtonBar
          placeholder="to"
          className="flex-1"
        />
      </div>
    </div>
  );
}

/* --- Sort helpers (column headers) ------------------------- */

export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}

export function cmp(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
