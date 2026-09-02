"use client";

import { useEffect, useRef, useState } from "react";

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
    <fieldset ref={ref} className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Milestones <span className="font-normal text-slate-400">— optional, add more later</span>
      </legend>

      {!isMilestoneType ? (
        <p className="text-xs text-slate-400">
          A Whole Project has a single delivery. Switch to “Milestone Project” above to plan milestones here.
        </p>
      ) : (
        <>
          <input type="hidden" name="milestonesJson" value={payload} />
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder={`Milestone ${i + 1} title`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Remove milestone"
                    className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Start date
                    <input
                      type="date"
                      value={row.startDate}
                      onChange={(e) => update(i, { startDate: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Due date
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => update(i, { dueDate: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
                <textarea
                  value={row.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="What's delivered in this milestone? (optional)"
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, blank()])}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            + Add milestone
          </button>
        </>
      )}
    </fieldset>
  );
}
