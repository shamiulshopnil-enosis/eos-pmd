"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { MilestoneWithProject } from "@/lib/types";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { EmptyState, FlagBadge, MilestoneStatusBadge, StarRating } from "@/components/ui";
import { FilterBar, FilterDateRange, FilterSelect, FilterText } from "@/components/filters";

const FLAGS: [string, string][] = [
  ["", "Any flag"],
  ["OVERDUE", "Overdue"],
  ["DUE_SOON", "Due soon"],
  ["AWAITING_REVIEW", "Awaiting review"],
];

const RATINGS: [string, string][] = [
  ["any", "Any rating"],
  ["5", "5.0"],
  ["4", "4.0 – 4.9"],
  ["3", "3.0 – 3.9"],
  ["2", "2.0 – 2.9"],
  ["1", "Below 2.0"],
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

type Row = {
  id: string;
  title: string;
  project: string;
  projectId: string;
  client: string;
  start: number | null;
  due: number | null;
  reviewed: number | null;
  status: string;
  rating: number | null;
  m: MilestoneWithProject;
};

export default function MilestonesTable({ milestones }: { milestones: MilestoneWithProject[] }) {
  const [f, setF] = useState({ ...EMPTY });
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

  const rows = useMemo<Row[]>(
    () =>
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        project: m.project.name,
        projectId: m.project.id,
        client: m.project.clientCompanyName,
        start: m.startDate ? new Date(m.startDate).getTime() : null,
        due: m.dueDate ? new Date(m.dueDate).getTime() : null,
        reviewed: m.reviewedAt ? new Date(m.reviewedAt).getTime() : null,
        status: m.status,
        rating: m.rating,
        m,
      })),
    [milestones],
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return rows.filter(({ m }) => {
      if (q && !`${m.title} ${m.project.name} ${m.project.clientCompanyName}`.toLowerCase().includes(q)) return false;
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
  }, [rows, f]);

  const active = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const activeCount = (Object.keys(EMPTY) as (keyof typeof EMPTY)[]).filter((k) => f[k] !== EMPTY[k]).length;

  return (
    <>
      <FilterBar active={active} count={activeCount} onClear={() => setF({ ...EMPTY })}>
        <FilterText label="Search" value={f.q} onChange={(v) => set({ q: v })} placeholder="Milestone, project, client…" />
        <FilterSelect label="Status" value={f.status} onChange={(v) => set({ status: v })} width="w-40" options={[["", "Any"], ...Object.entries(MILESTONE_STATUS_LABELS)]} />
        <FilterSelect label="Flag" value={f.flag} onChange={(v) => set({ flag: v })} width="w-40" options={FLAGS} />
        <FilterSelect label="Project" value={f.project} onChange={(v) => set({ project: v })} width="w-52" options={projectOptions} />
        <FilterSelect label="Client" value={f.client} onChange={(v) => set({ client: v })} width="w-44" options={clientOptions} />
        <FilterSelect label="Rating" value={f.rating} onChange={(v) => set({ rating: v })} width="w-36" options={RATINGS} />
        <FilterDateRange label="Start date" from={f.startFrom} to={f.startTo} onFrom={(v) => set({ startFrom: v })} onTo={(v) => set({ startTo: v })} />
        <FilterDateRange label="Due date" from={f.dueFrom} to={f.dueTo} onFrom={(v) => set({ dueFrom: v })} onTo={(v) => set({ dueTo: v })} />
        <FilterDateRange label="Reviewed" from={f.reviewedFrom} to={f.reviewedTo} onFrom={(v) => set({ reviewedFrom: v })} onTo={(v) => set({ reviewedTo: v })} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon="filter_alt_off" title="No milestones match your filters" description="Adjust or clear the filters above." />
      ) : (
        <DataTable value={filtered} dataKey="id" removableSort className="eos-table" tableStyle={{ minWidth: "960px" }} scrollable>
          <Column
            field="title"
            header="Milestone"
            sortable
            body={(r: Row) => (
              <Link href={`/projects/${r.projectId}/milestones/${r.id}`} className="font-medium text-ink hover:text-link hover:underline">
                {r.title}
              </Link>
            )}
          />
          <Column
            field="project"
            header="Project"
            sortable
            body={(r: Row) => (
              <Link href={`/projects/${r.projectId}`} className="text-ink-muted hover:text-link hover:underline">
                {r.project}
              </Link>
            )}
          />
          <Column field="client" header="Client" sortable body={(r: Row) => <span className="text-ink-muted">{r.client}</span>} />
          <Column field="start" header="Start" sortable body={(r: Row) => <span className="font-mono text-xs text-ink-muted">{formatDate(r.m.startDate)}</span>} />
          <Column field="due" header="Due" sortable body={(r: Row) => <span className="font-mono text-xs text-ink-muted">{formatDate(r.m.dueDate)}</span>} />
          <Column field="reviewed" header="Reviewed" sortable body={(r: Row) => <span className="font-mono text-xs text-ink-muted">{formatDate(r.m.reviewedAt)}</span>} />
          <Column
            field="status"
            header="Status"
            sortable
            body={(r: Row) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <MilestoneStatusBadge status={r.status} />
                <FlagBadge flag={getMilestoneFlag(r.m)} />
              </div>
            )}
          />
          <Column
            field="rating"
            header="Rating"
            sortable
            align="right"
            body={(r: Row) => (isMilestoneReviewed(r.m) ? <StarRating value={r.rating} /> : <span className="text-ink-muted">—</span>)}
          />
        </DataTable>
      )}
      <p className="mt-2 font-mono text-xs text-ink-muted">
        {filtered.length} of {milestones.length} shown
      </p>
    </>
  );
}
