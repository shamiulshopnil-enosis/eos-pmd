"use client";

import { useMemo, useState } from "react";
import type { CompanyMember } from "@/lib/types";

// Jira-style people picker: type to search your company's directory, click to
// add, remove with the ×. Emits a hidden <input name={name}> per selected id
// (plus one empty input so the field is always submitted, even when cleared).
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
  const [selected, setSelected] = useState<string[]>(
    defaultSelectedIds.filter((id) => byId.has(id)),
  );
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !selected.includes(m.id))
      .filter((m) =>
        q ? `${m.name ?? ""} ${m.email}`.toLowerCase().includes(q) : true,
      )
      .slice(0, 8);
  }, [members, selected, query]);

  const label = (m: CompanyMember) => (m.name ? `${m.name} · ${m.email}` : m.email);

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">
        Your company has no people yet. Add them under{" "}
        <span className="font-medium">My Company</span>, then assign them here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value="" />
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const m = byId.get(id);
            if (!m) return null;
            return (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              >
                {label(m)}
                <button
                  type="button"
                  aria-label={`Remove ${label(m)}`}
                  onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                  className="rounded-full px-1 text-blue-500 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
      />

      {query.trim() ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          {matches.length > 0 ? (
            <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((s) => [...s, m.id]);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-200">{label(m)}</span>
                    {m.invitePending ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400">not signed in</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">No matching people.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
