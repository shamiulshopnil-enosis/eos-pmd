"use client";

import type { ReactNode } from "react";
import { Panel } from "primereact/panel";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";

// Shared building blocks for the live filter panels on the Projects and
// Milestones lists. Every control is a PrimeReact widget; changes apply
// instantly, no submit.

const fieldLabel = "text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted";

export function FilterBar({
  children,
  onClear,
  active,
  count,
}: {
  children: ReactNode;
  onClear: () => void;
  active: boolean;
  count?: number;
}) {
  return (
    <Panel
      toggleable
      collapsed={!active}
      className="eos-filter-panel mb-5"
      headerTemplate={(options) => (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
          <button type="button" className={options.togglerClassName} onClick={options.onTogglerClick}>
            <span className={options.togglerIconClassName} />
          </button>
          <i className="pi pi-sliders-h text-ink-muted" />
          <span className="font-medium text-ink">Filters</span>
          {active ? (
            <span className="font-mono text-xs tabular-nums text-link">
              {typeof count === "number" ? `${count} active` : "active"}
            </span>
          ) : null}
          {active ? (
            <Button
              type="button"
              text
              size="small"
              className="ml-auto"
              icon="pi pi-times"
              label="Clear"
              onClick={onClear}
            />
          ) : null}
        </div>
      )}
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5">{children}</div>
    </Panel>
  );
}

export function FilterText({
  label,
  value,
  onChange,
  placeholder,
  width = "w-52",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <label className={`${width} ${fieldLabel}`}>
      {label}
      <IconField iconPosition="left" className="mt-1 block">
        <InputIcon className="pi pi-search" />
        <InputText
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
      </IconField>
    </label>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  width = "w-44",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  width?: string;
}) {
  return (
    <label className={`${width} ${fieldLabel}`}>
      {label}
      <Dropdown
        value={value}
        onChange={(e) => onChange(e.value ?? "")}
        options={options.map(([v, l]) => ({ value: v, label: l }))}
        className="mt-1 w-full"
      />
    </label>
  );
}

const iso = (d: Date | null | undefined) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";

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
    <div className={fieldLabel}>
      {label}
      <div className="mt-1 flex items-center gap-1">
        <Calendar
          value={from ? new Date(from) : null}
          onChange={(e) => onFrom(iso(e.value as Date | null))}
          dateFormat="yy-mm-dd"
          showButtonBar
          placeholder="from"
          className="w-36"
        />
        <span className="text-ink-muted">–</span>
        <Calendar
          value={to ? new Date(to) : null}
          onChange={(e) => onTo(iso(e.value as Date | null))}
          dateFormat="yy-mm-dd"
          showButtonBar
          placeholder="to"
          className="w-36"
        />
      </div>
    </div>
  );
}

/** Toggle asc/desc for a repeated key, else switch key and default to asc. */
export function nextSort<K extends string>(
  current: { key: K; dir: "asc" | "desc" },
  key: K,
): { key: K; dir: "asc" | "desc" } {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}

export function cmp(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
