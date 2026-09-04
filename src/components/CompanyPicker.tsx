"use client";

import { useMemo, useState } from "react";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Field, TextInput } from "@/components/form";
import type { CompanySummary } from "@/lib/types";

// Combobox for picking the client company on the new-project form, with an
// inline "add a new company" path. Renders the inputs createProject reads:
// `receivingCompanyId` when an existing company is picked, or `newCompany*`
// fields for a new one. Controls are PrimeReact widgets.

type PickerOrg = Pick<CompanySummary, "id" | "name" | "primaryContact">;

export default function CompanyPicker({ companies }: { companies: PickerOrg[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickerOrg | null>(null);
  const [adding, setAdding] = useState(false);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return [];
    return companies.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [companies, trimmed]);

  const exactMatch = companies.some((o) => o.name.trim().toLowerCase() === query.trim().toLowerCase());

  function reset() {
    setSelected(null);
    setAdding(false);
    setQuery("");
  }

  if (selected) {
    return (
      <div className="rounded-ledger border border-rule p-3 text-sm">
        <input type="hidden" name="receivingCompanyId" value={selected.id} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-ink">{selected.name}</div>
            {selected.primaryContact ? (
              <div className="text-xs text-ink-muted">
                {selected.primaryContact.name ? `${selected.primaryContact.name} · ` : ""}
                {selected.primaryContact.email}
              </div>
            ) : null}
            <div className="mt-1 text-xs text-ink-muted">
              Their contact is invited as the project&apos;s primary client contact.
            </div>
          </div>
          <Button type="button" text size="small" label="Change" onClick={reset} />
        </div>
      </div>
    );
  }

  if (adding) {
    return (
      <div className="space-y-3 rounded-ledger border border-rule p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">New client company</span>
          <Button type="button" text size="small" label="Back to search" onClick={reset} />
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
        <p className="text-xs text-ink-muted">
          Added to the directory. The contact claims the company the first time they sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <IconField iconPosition="left" className="block">
        <InputIcon className="pi pi-search" />
        <InputText
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies by name…"
          autoComplete="off"
          className="w-full"
        />
      </IconField>

      {trimmed ? (
        <div className="rounded-ledger border border-rule">
          {matches.length > 0 ? (
            <ul className="max-h-56 divide-y divide-rule overflow-y-auto text-sm">
              {matches.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-band"
                  >
                    <span className="font-medium text-ink">{o.name}</span>
                    {o.primaryContact ? (
                      <span className="text-xs text-ink-muted">
                        {o.primaryContact.name ? `${o.primaryContact.name} · ` : ""}
                        {o.primaryContact.email}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-ink-muted">No matching company.</div>
          )}
          {!exactMatch ? (
            <div className="border-t border-rule p-1.5">
              <Button
                type="button"
                text
                size="small"
                icon="pi pi-plus"
                label={`Add “${trimmed}” as a new company`}
                onClick={() => setAdding(true)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-ink-muted">
        Pick an existing company or add a new one. A project needs a client company.
      </p>
    </div>
  );
}
