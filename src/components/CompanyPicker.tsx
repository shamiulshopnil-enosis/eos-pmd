"use client";

import { useMemo, useState } from "react";
import { Field, TextInput } from "@/components/form";
import type { CompanySummary } from "@/lib/types";

// Combobox for picking the client company on the new-project form, with an
// inline "add a new company" path. Renders the inputs createProject reads:
// `receivingCompanyId` when an existing company is picked, or `newCompany*` fields for a new
// one.

type PickerOrg = Pick<CompanySummary, "id" | "name" | "primaryContact">;

export default function CompanyPicker({ companies }: { companies: PickerOrg[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickerOrg | null>(null);
  const [adding, setAdding] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies.slice(0, 8);
    return companies.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [companies, query]);

  const exactMatch = companies.some(
    (o) => o.name.trim().toLowerCase() === query.trim().toLowerCase(),
  );

  function reset() {
    setSelected(null);
    setAdding(false);
    setQuery("");
  }

  if (selected) {
    return (
      <div className="rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-700">
        <input type="hidden" name="receivingCompanyId" value={selected.id} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-100">{selected.name}</div>
            {selected.primaryContact ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selected.primaryContact.name ? `${selected.primaryContact.name} · ` : ""}
                {selected.primaryContact.email}
              </div>
            ) : null}
            <div className="mt-1 text-xs text-slate-400">
              Their contact is invited as the project&apos;s primary client contact.
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  if (adding) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            New client company
          </span>
          <button type="button" onClick={reset} className="text-xs font-medium text-blue-600 hover:underline">
            Back to search
          </button>
        </div>
        <Field label="Company name" required>
          <TextInput name="newCompanyName" required defaultValue={query} placeholder="e.g. Big Step Solutions" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Contact person name">
            <TextInput name="newCompanyContactName" placeholder="e.g. Dana Reid" />
          </Field>
          <Field label="Contact email" required>
            <TextInput type="email" name="newCompanyContactEmail" required placeholder="dana@bigstep.com" />
          </Field>
        </div>
        <Field label="Designation">
          <TextInput name="newCompanyDesignation" placeholder="e.g. Product Owner" />
        </Field>
        <p className="text-xs text-slate-400">
          Added to the directory. The contact claims the company the first time they sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search companies…"
        autoComplete="off"
      />
      <div className="rounded-lg border border-slate-200 dark:border-slate-800">
        {matches.length > 0 ? (
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
            {matches.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{o.name}</span>
                  {o.primaryContact ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {o.primaryContact.name ? `${o.primaryContact.name} · ` : ""}
                      {o.primaryContact.email}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-2 text-sm text-slate-400">
            {query.trim() ? "No matching company." : "Start typing to search."}
          </div>
        )}
        {query.trim() && !exactMatch ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-950/40"
          >
            <span aria-hidden>＋</span> Add “{query.trim()}” as a new company
          </button>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">
        Pick an existing company or add a new one — a project needs a client company.
      </p>
    </div>
  );
}
