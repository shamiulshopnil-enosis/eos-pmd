"use client";

import { useState } from "react";
import { Checkbox } from "primereact/checkbox";

type Person = { email: string; name: string | null; invitePending: boolean };

/** Assignee multi-select for the milestone forms — PrimeReact <Checkbox>es that
 *  post their checked emails under `assigneeEmails` (plus one empty input so the
 *  field is always submitted). */
export default function AssigneeCheckboxes({
  people,
  defaultSelectedEmails = [],
}: {
  people: Person[];
  defaultSelectedEmails?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(
    defaultSelectedEmails.map((e) => e.toLowerCase()),
  );

  if (people.length === 0) {
    return <p className="text-xs text-ink-muted">No vendor team members to assign yet.</p>;
  }

  const toggle = (email: string) =>
    setSelected((s) => (s.includes(email) ? s.filter((x) => x !== email) : [...s, email]));

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      <input type="hidden" name="assigneeEmails" value="" />
      {people.map((m) => {
        const key = m.email.toLowerCase();
        const checked = selected.includes(key);
        return (
          <label key={m.email} className="flex items-center gap-2 text-sm text-ink-muted">
            <Checkbox checked={checked} onChange={() => toggle(key)} />
            {checked ? <input type="hidden" name="assigneeEmails" value={m.email} /> : null}
            {m.name ? `${m.name} · ` : ""}
            {m.email}
            {m.invitePending ? <span className="text-xs text-rag-warn">(pending)</span> : null}
          </label>
        );
      })}
    </div>
  );
}
