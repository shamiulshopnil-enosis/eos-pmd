"use client";

import { useMemo, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";

export type MilestonePerson = { id?: string; email: string; name: string | null };

type Row = {
  title: string;
  startDate: string;
  dueDate: string;
  description: string;
  assigneeEmails: string[];
};

const blank = (): Row => ({
  title: "",
  startDate: "",
  dueDate: "",
  description: "",
  assigneeEmails: [],
});

/**
 * Inline milestone planning on the new-project form. Every project is a
 * milestone project now, so this is always shown and always required: at least
 * one milestone, and every milestone needs at least one assignee. The rows are
 * serialised into a hidden `milestonesJson` field that `createProject` reads.
 */
export default function ProjectMilestonesField({ people }: { people: MilestonePerson[] }) {
  const [rows, setRows] = useState<Row[]>([blank()]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) =>
    setRows((rs) => (rs.length === 1 ? [blank()] : rs.filter((_, idx) => idx !== i)));
  const toggleAssignee = (i: number, email: string) =>
    setRows((rs) =>
      rs.map((r, idx) =>
        idx === i
          ? {
              ...r,
              assigneeEmails: r.assigneeEmails.includes(email)
                ? r.assigneeEmails.filter((e) => e !== email)
                : [...r.assigneeEmails, email],
            }
          : r,
      ),
    );

  const kept = rows.filter((r) => r.title.trim() !== "");
  const payload = JSON.stringify(kept);
  const valid = kept.length > 0 && kept.every((r) => r.assigneeEmails.length > 0);

  return (
    <fieldset className="space-y-3 border-t border-rule pt-5">
      <legend className="text-sm font-medium text-ink">
        Milestones <span className="text-rag-bad">*</span>
        <span className="ml-1 font-normal text-ink-muted">
          — at least one, each with an assignee
        </span>
      </legend>

      <input type="hidden" name="milestonesJson" value={payload} />
      <input
        type="text"
        required
        value={valid ? "ok" : ""}
        onChange={() => {}}
        aria-label="Add at least one milestone, each with an assignee"
        className="sr-only"
      />

      {people.length === 0 ? (
        <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-xs text-rag-warn">
          Add people to your company directory first — every milestone needs an assignee.
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row, i) => (
          <MilestoneRow
            key={i}
            row={row}
            index={i}
            people={people}
            onChange={(patch) => update(i, patch)}
            onRemove={() => remove(i)}
            onToggleAssignee={(email) => toggleAssignee(i, email)}
          />
        ))}
      </div>

      <Button
        type="button"
        text
        size="small"
        icon="pi pi-plus"
        label="Add milestone"
        onClick={() => setRows((rs) => [...rs, blank()])}
      />
    </fieldset>
  );
}

function MilestoneRow({
  row,
  index,
  people,
  onChange,
  onRemove,
  onToggleAssignee,
}: {
  row: Row;
  index: number;
  people: MilestonePerson[];
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  onToggleAssignee: (email: string) => void;
}) {
  const [q, setQ] = useState("");
  const label = (p: MilestonePerson) => (p.name ? `${p.name} · ${p.email}` : p.email);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people
      .filter((p) => (needle ? label(p).toLowerCase().includes(needle) : true))
      .slice(0, 8);
  }, [people, q]);
  const selected = people.filter((p) =>
    row.assigneeEmails.includes(p.email.toLowerCase()),
  );

  return (
    <div className="rounded-ledger border border-rule p-3">
      <div className="flex items-start gap-2">
        <InputText
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`Milestone ${index + 1} title`}
          className="w-full"
        />
        <Button
          type="button"
          text
          severity="danger"
          icon="pi pi-times"
          aria-label="Remove milestone"
          onClick={onRemove}
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-ink-muted">
          Start date
          <InputText
            type="date"
            value={row.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-ink-muted">
          Due date
          <InputText
            type="date"
            value={row.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <InputTextarea
        value={row.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What's delivered in this milestone? (optional)"
        rows={2}
        className="mt-2 w-full"
      />

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-ink">
          Assignees <span className="text-rag-bad">*</span>
        </div>
        {selected.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {selected.map((p) => (
              <li key={p.email} className="eos-chip">
                {label(p)}
                <button
                  type="button"
                  aria-label={`Remove ${label(p)}`}
                  onClick={() => onToggleAssignee(p.email.toLowerCase())}
                  className="eos-chip-x"
                >
                  <i className="pi pi-times text-[11px]" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-xs text-rag-warn">
            Pick at least one person — a milestone can&apos;t be created without an assignee.
          </p>
        )}
        {people.length > 6 ? (
          <InputText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter people…"
            className="mb-1.5 w-full"
          />
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {filtered
            .filter((p) => !row.assigneeEmails.includes(p.email.toLowerCase()))
            .map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => onToggleAssignee(p.email.toLowerCase())}
                className="rounded-[6px] border border-rule px-2 py-1 text-xs text-ink-muted transition-colors hover:border-link hover:text-ink"
              >
                + {label(p)}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
