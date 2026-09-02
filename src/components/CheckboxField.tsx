"use client";

import { useState, type ReactNode } from "react";
import { Checkbox } from "primereact/checkbox";

/** A single PrimeReact <Checkbox> that posts `value` under `name` when checked. */
export function SingleCheckbox({
  name,
  value = "on",
  defaultChecked = false,
  children,
}: {
  name: string;
  value?: string;
  defaultChecked?: boolean;
  children: ReactNode;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-start gap-2 text-sm text-ink-muted">
      <Checkbox checked={checked} onChange={(e) => setChecked(!!e.checked)} className="mt-0.5" />
      {checked ? <input type="hidden" name={name} value={value} /> : null}
      <span>{children}</span>
    </label>
  );
}

/** A group of PrimeReact <Checkbox>es posting each checked option under `name`. */
export function CheckboxGroup({
  name,
  options,
  columns = 2,
}: {
  name: string;
  options: string[];
  columns?: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  return (
    <div className={`grid grid-cols-1 gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <label
            key={opt}
            className="flex items-center gap-2 rounded-ledger border border-rule px-3 py-2 text-sm text-ink"
          >
            <Checkbox checked={checked} onChange={() => toggle(opt)} />
            {checked ? <input type="hidden" name={name} value={opt} /> : null}
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
