"use client";

import { useMemo, useState } from "react";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import type { CompanyMember } from "@/lib/types";

// People picker built on PrimeReact <AutoComplete multiple>: type to search your
// company's directory, pick to add, remove with the chip ×. Emits a hidden
// <input name={name}> per selected id (plus one empty input so the field is
// always submitted, even when cleared).
export default function PeoplePicker({
  members,
  name = "memberIds",
  defaultSelectedIds = [],
  placeholder = "Search people by name or email…",
}: {
  members: CompanyMember[];
  name?: string;
  defaultSelectedIds?: string[];
  placeholder?: string;
}) {
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [selected, setSelected] = useState<CompanyMember[]>(
    defaultSelectedIds.map((id) => byId.get(id)).filter((m): m is CompanyMember => !!m),
  );
  const [suggestions, setSuggestions] = useState<CompanyMember[]>([]);

  const label = (m: CompanyMember) => (m.name ? `${m.name} · ${m.email}` : m.email);

  const search = (e: AutoCompleteCompleteEvent) => {
    const q = e.query.trim().toLowerCase();
    const chosen = new Set(selected.map((m) => m.id));
    setSuggestions(
      members
        .filter((m) => !chosen.has(m.id))
        .filter((m) => (q ? `${m.name ?? ""} ${m.email}`.toLowerCase().includes(q) : true)),
    );
  };

  if (members.length === 0) {
    return (
      <p className="rounded-ledger border border-dashed border-rule p-3 text-xs text-ink-muted">
        Your company has no people yet. Add them under <span className="font-medium">My Company</span>, then assign
        them here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value="" />
      {selected.map((m) => (
        <input key={m.id} type="hidden" name={name} value={m.id} />
      ))}

      <AutoComplete
        multiple
        dropdown
        forceSelection
        value={selected}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => setSelected(e.value as CompanyMember[])}
        field="email"
        placeholder={selected.length === 0 ? placeholder : undefined}
        itemTemplate={(m: CompanyMember) => (
          <span className="flex items-center justify-between gap-3">
            <span>{label(m)}</span>
            {m.invitePending ? <span className="text-xs text-rag-warn">not signed in</span> : null}
          </span>
        )}
        selectedItemTemplate={(m: CompanyMember) => <span>{label(m)}</span>}
        className="w-full"
        pt={{ container: { className: "w-full flex flex-wrap gap-1" } }}
      />
    </div>
  );
}
