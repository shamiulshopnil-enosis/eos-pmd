"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MilestoneWithProject } from "@/lib/types";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, FlagBadge, MilestoneStatusBadge, StarRating } from "@/components/ui";
import { FilterBar, FilterDateRange, FilterSelect, FilterText, SortHeader, cmp, nextSort } from "@/components/filters";

type SortKey = "title" | "project" | "client" | "start" | "due" | "reviewed" | "status" | "rating";

const FLAGS: [string, string][] = [
  ["", "Any flag"],
  ["OVERDUE", "Overdue"],
  ["DUE_SOON", "Due soon"],
  ["AWAITING_REVIEW", "Awaiting review"],
];

const RATINGS: [string, string][] = [
  ["any", "Any rating"],
  ["5", "5 ★"],
  ["4", "4 – 4.9 ★"],
  ["3", "3 – 3.9 ★"],
  ["2", "2 – 2.9 ★"],
  ["1", "< 2 ★"],
  ["none", "Unrated"],
];

const EMPTY = {
  q: "",
  status: "",
  flag: "",
  project: "",
  client: "",
  rating: "any",
  startFrom: "",
  startTo: "",
  dueFrom: "",
  dueTo: "",
  reviewedFrom: "",
  reviewedTo: "",
};

function inRange(d: Date | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!d) return false;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function ratingMatches(band: string, r: number | null): boolean {
  if (band === "any") return true;
  if (band === "none") return r == null;
  if (r == null) return false;
  if (band === "5") return r >= 5;
  const lo = Number(band);
  return r >= lo && r < lo + 1;
}

export default function MilestonesTable({ milestones }: { milestones: MilestoneWithProject[] }) {
  const [f, setF] = useState({ ...EMPTY });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "due", dir: "asc" });
  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));

  const projectOptions = useMemo<[string, string][]>(() => {
    const m = new Map<string, string>();
    for (const x of milestones) m.set(x.project.id, x.project.name);
    return [["", "Any project"], ...[...m].sort((a, b) => a[1].localeCompare(b[1]))];
  }, [milestones]);

  const clientOptions = useMemo<[string, string][]>(() => {
    const s = new Set<string>();
    for (const x of milestones) s.add(x.project.clientCompanyName);
    return [["", "Any client"], ...[...s].sort().map((c) => [c, c] as [string, string])];
  }, [milestones]);

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = milestones.filter((m) => {
      if (q && !`${m.title} ${m.project.name} ${m.project.clientCompanyName}`.toLowerCase().includes(q))
        return false;
      if (f.status && m.status !== f.status) return false;
      if (f.flag && getMilestoneFlag(m) !== f.flag) return false;
      if (f.project && m.project.id !== f.project) return false;
      if (f.client && m.project.clientCompanyName !== f.client) return false;
      if (!ratingMatches(f.rating, m.rating)) return false;
      if (!inRange(m.startDate, f.startFrom, f.startTo)) return false;
      if (!inRange(m.dueDate, f.dueFrom, f.dueTo)) return false;
      if (!inRange(m.reviewedAt, f.reviewedFrom, f.reviewedTo)) return false;
      return true;
    });

    const val = (m: MilestoneWithProject) => {
      switch (sort.key) {
        case "title": return m.title.toLowerCase();
        case "project": return m.project.name.toLowerCase();
        case "client": return m.project.clientCompanyName.toLowerCase();
        case "start": return m.startDate ? new Date(m.startDate).getTime() : null;
        case "due": return m.dueDate ? new Date(m.dueDate).getTime() : null;
        case "reviewed": return m.reviewedAt ? new Date(m.reviewedAt).getTime() : null;
        case "status": return m.status;
        case "rating": return m.rating;
      }
    };
    return [...out].sort((a, b) => {
      const d = cmp(val(a), val(b));
      return sort.dir === "asc" ? d : -d;
    });
  }, [milestones, f, sort]);

  const active = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const onSort = (k: SortKey) => setSort((s) => nextSort(s, k));
  const th = (label: string, key: SortKey, align?: "left" | "right") => (
    <SortHeader label={label} sortKey={key} active={sort.key === key} dir={sort.dir} onSort={onSort} align={align} />
  );

  return (
    <>
      <FilterBar active={active} onClear={() => setF({ ...EMPTY })}>
        <FilterText label="Search" value={f.q} onChange={(v) => set({ q: v })} placeholder="Milestone, project, client…" />
        <FilterSelect
          label="Status"
          value={f.status}
          onChange={(v) => set({ status: v })}
          width="w-40"
          options={[["", "Any"], ...Object.entries(MILESTONE_STATUS_LABELS)]}
        />
        <FilterSelect label="Flag" value={f.flag} onChange={(v) => set({ flag: v })} width="w-40" options={FLAGS} />
        <FilterSelect label="Project" value={f.project} onChange={(v) => set({ project: v })} width="w-52" options={projectOptions} />
        <FilterSelect label="Client" value={f.client} onChange={(v) => set({ client: v })} width="w-44" options={clientOptions} />
        <FilterSelect label="Rating" value={f.rating} onChange={(v) => set({ rating: v })} width="w-36" options={RATINGS} />
        <FilterDateRange label="Start date" from={f.startFrom} to={f.startTo} onFrom={(v) => set({ startFrom: v })} onTo={(v) => set({ startTo: v })} />
        <FilterDateRange label="Due date" from={f.dueFrom} to={f.dueTo} onFrom={(v) => set({ dueFrom: v })} onTo={(v) => set({ dueTo: v })} />
        <FilterDateRange label="Reviewed" from={f.reviewedFrom} to={f.reviewedTo} onFrom={(v) => set({ reviewedFrom: v })} onTo={(v) => set({ reviewedTo: v })} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No milestones match your filters" description="Adjust or clear the filters above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                {th("Milestone", "title")}
                {th("Project", "project")}
                {th("Client", "client")}
                {th("Start", "start")}
                {th("Due", "due")}
                {th("Reviewed", "reviewed")}
                {th("Status", "status")}
                {th("Rating", "rating", "right")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${m.project.id}/milestones/${m.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <Link href={`/projects/${m.project.id}`} className="hover:underline">
                      {m.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.project.clientCompanyName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.startDate)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.dueDate)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.reviewedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MilestoneStatusBadge status={m.status} />
                      <FlagBadge flag={getMilestoneFlag(m)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isMilestoneReviewed(m) ? <StarRating value={m.rating} /> : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-2 text-xs text-slate-400">
        {filtered.length} of {milestones.length} shown
      </p>
    </>
  );
}
