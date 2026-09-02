"use client";

import { useEffect, useRef, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";

type Row = { title: string; startDate: string; dueDate: string; description: string };

const blank = (): Row => ({ title: "", startDate: "", dueDate: "", description: "" });

// Optional inline milestone planning on the new-project form. Only shown while
// "Milestone Project" is selected; serialises the rows into a hidden
// `milestonesJson` field that createProject reads.
export default function ProjectMilestonesField() {
  const ref = useRef<HTMLFieldSetElement>(null);
  const [isMilestoneType, setIsMilestoneType] = useState(true);
  const [rows, setRows] = useState<Row[]>([blank()]);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="projectType"]'));
    const sync = () => {
      const checked = radios.find((r) => r.checked);
      setIsMilestoneType(!checked || checked.value === "milestone");
    };
    radios.forEach((r) => r.addEventListener("change", sync));
    sync();
    return () => radios.forEach((r) => r.removeEventListener("change", sync));
  }, []);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => (rs.length === 1 ? [blank()] : rs.filter((_, idx) => idx !== i)));

  const payload = JSON.stringify(rows.filter((r) => r.title.trim() !== ""));

  return (
    <fieldset ref={ref} className="space-y-3 border-t border-rule pt-5">
      <legend className="text-sm font-medium text-ink">
        Milestones <span className="font-normal text-ink-muted">— optional, add more later</span>
      </legend>

      {!isMilestoneType ? (
        <p className="text-xs text-ink-muted">
          A Whole Project has a single delivery. Switch to “Milestone Project” above to plan milestones here.
        </p>
      ) : (
        <>
          <input type="hidden" name="milestonesJson" value={payload} />
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-ledger border border-rule p-3">
                <div className="flex items-start gap-2">
                  <InputText
                    value={row.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder={`Milestone ${i + 1} title`}
                    className="w-full"
                  />
                  <Button
                    type="button"
                    text
                    severity="danger"
                    icon="pi pi-times"
                    aria-label="Remove milestone"
                    onClick={() => remove(i)}
                  />
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-ink-muted">
                    Start date
                    <InputText
                      type="date"
                      value={row.startDate}
                      onChange={(e) => update(i, { startDate: e.target.value })}
                      className="mt-1 w-full"
                    />
                  </label>
                  <label className="text-xs text-ink-muted">
                    Due date
                    <InputText
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => update(i, { dueDate: e.target.value })}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
                <InputTextarea
                  value={row.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="What's delivered in this milestone? (optional)"
                  rows={2}
                  className="mt-2 w-full"
                />
              </div>
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
        </>
      )}
    </fieldset>
  );
}
