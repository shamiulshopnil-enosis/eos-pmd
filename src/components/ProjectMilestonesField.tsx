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
 * Inline milestone planning on the new-project form. Milestones are optional at
 * creation time — the planner stays hidden behind a CTA and can be revealed to
 * plan a few upfront, or skipped entirely and added later from the project
 * page. Any milestone that IS planned here still needs at least one assignee.
 * The rows are serialised into a hidden `milestonesJson` field that
 * `createProject` reads ("[]" while the planner is collapsed).
 */
export default function ProjectMilestonesField({ people }: { people: MilestonePerson[] }) {
  const [expanded, setExpanded] = useState(false);
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

  const collapse = () => {
    setRows([blank()]);
    setExpanded(false);
  };

  const kept = expanded ? rows.filter((r) => r.title.trim() !== "") : [];
  const payload = JSON.stringify(kept);
  // Optional: fine with no milestones. But a titled row must carry an assignee,
  // otherwise the create call would fail server-side.
  const valid = kept.every((r) => r.assigneeEmails.length > 0);

  return (
    <fieldset className="space-y-3 border-t border-rule pt-5">
      <legend className="text-sm font-medium text-ink">
        Milestones
        <span className="ml-1 font-normal text-ink-muted">
          (optional — plan now or add them later)
        </span>
      </legend>

      <input type="hidden" name="milestonesJson" value={payload} />
      <input
        type="text"
        required
        value={valid ? "ok" : ""}
        onChange={() => {}}
        aria-label="Every planned milestone needs an assignee"
        className="sr-only"
      />

      {!expanded ? (
        <Button
          type="button"
          outlined
          size="small"
          icon="pi pi-plus"
          label="Plan milestones"
          onClick={() => setExpanded(true)}
        />
      ) : (
        <>
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              text
              size="small"
              icon="pi pi-plus"
              label="Add milestone"
              onClick={() => setRows((rs) => [...rs, blank()])}
            />
            <Button
              type="button"
              text
              size="small"
              severity="secondary"
              label="Cancel"
              onClick={collapse}
            />
          </div>
        </>
      )}
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
            Pick at least one person. A milestone can&apos;t be created without an assignee.
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
