"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { ProjectWithMilestones } from "@/lib/types";
import { computeProjectPerformance } from "@/lib/derived";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  ADMIN_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
  CLIENT_HEALTH_LABELS,
} from "@/lib/constants";
import { formatRating } from "@/lib/format";
import {
  AdminStatusBadge,
  Badge,
  EmptyState,
  ExecutionStatusBadge,
  HealthBadge,
  ProjectStatusBadge,
  ProjectTypeBadge,
  RagDisc,
} from "@/components/ui";
import { FilterBar, FilterDateRange, FilterSelect, FilterText } from "@/components/filters";

const RATING_BANDS: [string, string][] = [
  ["any", "Any rating"],
  ["high", "≥ 4.0"],
  ["mid", "3.0 – 3.9"],
  ["low", "< 3.0"],
  ["none", "Unrated"],
];

const HEALTH_ORDER: Record<string, number> = { HAPPY: 0, NEEDS_ATTENTION: 1, AT_RISK: 2, NO_DATA: 3 };

const EMPTY = {
  q: "",
  status: "",
  approval: "",
  execution: "",
  visibility: "",
  type: "",
  health: "",
  rating: "any",
  startFrom: "",
  startTo: "",
  dueFrom: "",
  dueTo: "",
};

function inRange(d: Date | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!d) return false;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}

type Row = {
  id: string;
  name: string;
  client: string;
  status: string;
  approval: string;
  execution: string;
  visibility: string;
  type: string;
  milestones: number;
  rating: number | null;
  health: string;
  healthRank: number;
  project: ProjectWithMilestones;
  perf: ReturnType<typeof computeProjectPerformance>;
};

export default function ProjectsTable({ projects }: { projects: ProjectWithMilestones[] }) {
  const router = useRouter();
  const [f, setF] = useState({ ...EMPTY });
  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = useMemo<Row[]>(
    () =>
      projects.map((project) => {
        const perf = computeProjectPerformance(project);
        return {
          id: project.id,
          name: project.name,
          client: project.clientCompanyName,
          status: project.status,
          approval: project.adminStatus,
          execution: project.executionStatus,
          visibility: project.visibility,
          type: project.projectType,
          milestones: perf.totalMilestones,
          rating: perf.avgRating,
          health: perf.health,
          healthRank: HEALTH_ORDER[perf.health] ?? 9,
          project,
          perf,
        };
      }),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return rows.filter(({ project, perf }) => {
      if (q && !`${project.name} ${project.clientCompanyName}`.toLowerCase().includes(q)) return false;
      if (f.status && project.status !== f.status) return false;
      if (f.approval && project.adminStatus !== f.approval) return false;
      if (f.execution && project.executionStatus !== f.execution) return false;
      if (f.visibility && project.visibility !== f.visibility) return false;
      if (f.type && project.projectType !== f.type) return false;
      if (f.health && perf.health !== f.health) return false;
      if (f.rating !== "any") {
        const r = perf.avgRating;
        if (f.rating === "none" && r != null) return false;
        if (f.rating === "high" && !(r != null && r >= 4)) return false;
        if (f.rating === "mid" && !(r != null && r >= 3 && r < 4)) return false;
        if (f.rating === "low" && !(r != null && r < 3)) return false;
      }
      if (!inRange(project.startDate, f.startFrom, f.startTo)) return false;
      if (!inRange(project.expectedCompletionDate, f.dueFrom, f.dueTo)) return false;
      return true;
    });
  }, [rows, f]);

  const active = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const activeCount = (Object.keys(EMPTY) as (keyof typeof EMPTY)[]).filter((k) => f[k] !== EMPTY[k]).length;

  return (
    <>
      <FilterBar active={active} count={activeCount} onClear={() => setF({ ...EMPTY })}>
        <FilterText label="Search" value={f.q} onChange={(v) => set({ q: v })} placeholder="Project or client…" />
        <FilterSelect label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[["", "Any"], ...Object.entries(PROJECT_STATUS_LABELS)]} />
        <FilterSelect label="Approval" value={f.approval} onChange={(v) => set({ approval: v })} options={[["", "Any"], ...Object.entries(ADMIN_STATUS_LABELS)]} />
        <FilterSelect label="Execution" value={f.execution} onChange={(v) => set({ execution: v })} options={[["", "Any"], ...Object.entries(EXECUTION_STATUS_LABELS)]} />
        <FilterSelect label="Visibility" value={f.visibility} onChange={(v) => set({ visibility: v })} width="w-36" options={[["", "Any"], ["PRIVATE", "Private"], ["PUBLIC", "Public"]]} />
        <FilterSelect label="Type" value={f.type} onChange={(v) => set({ type: v })} width="w-40" options={[["", "Any"], ...Object.entries(PROJECT_TYPE_LABELS)]} />
        <FilterSelect label="Client health" value={f.health} onChange={(v) => set({ health: v })} options={[["", "Any"], ...Object.entries(CLIENT_HEALTH_LABELS)]} />
        <FilterSelect label="Avg rating" value={f.rating} onChange={(v) => set({ rating: v })} width="w-32" options={RATING_BANDS} />
        <FilterDateRange label="Start date" from={f.startFrom} to={f.startTo} onFrom={(v) => set({ startFrom: v })} onTo={(v) => set({ startTo: v })} />
        <FilterDateRange label="Expected completion" from={f.dueFrom} to={f.dueTo} onFrom={(v) => set({ dueFrom: v })} onTo={(v) => set({ dueTo: v })} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon="filter_alt_off" title="No projects match your filters" description="Adjust or clear the filters above." />
      ) : (
        <DataTable
          value={filtered}
          dataKey="id"
          removableSort
          className="eos-table eos-rows-clickable"
          tableStyle={{ minWidth: "1040px" }}
          scrollable
          onRowClick={(e) => {
            if (window.getSelection()?.toString()) return;
            router.push(`/projects/${(e.data as Row).id}`);
          }}
        >
          <Column
            field="name"
            header="Project"
            sortable
            body={(r: Row) => (
              <span className="flex items-center gap-2">
                <RagDisc health={r.perf.health} />
                <Link href={`/projects/${r.id}`} className="font-medium text-ink hover:text-link hover:underline">
                  {r.name}
                </Link>
              </span>
            )}
          />
          <Column field="client" header="Client" sortable body={(r: Row) => <span className="text-ink-muted">{r.client}</span>} />
          <Column field="status" header="Status" sortable body={(r: Row) => <ProjectStatusBadge status={r.status} />} />
          <Column field="approval" header="Approval" sortable body={(r: Row) => <AdminStatusBadge status={r.approval} />} />
          <Column field="execution" header="Execution" sortable body={(r: Row) => <ExecutionStatusBadge status={r.execution} />} />
          <Column
            field="visibility"
            header="Visibility"
            sortable
            body={(r: Row) => (
              <Badge tone={r.visibility === "PUBLIC" ? "blue" : "slate"}>{r.visibility === "PUBLIC" ? "Public" : "Private"}</Badge>
            )}
          />
          <Column field="type" header="Type" sortable body={(r: Row) => <ProjectTypeBadge type={r.type} />} />
          <Column
            field="milestones"
            header="Milestones"
            sortable
            align="right"
            body={(r: Row) => <span className="font-mono tabular-nums text-ink">{r.milestones}</span>}
          />
          <Column
            field="rating"
            header="Avg. rating"
            sortable
            align="right"
            body={(r: Row) => <span className="font-mono tabular-nums text-ink">{formatRating(r.rating)}</span>}
          />
          <Column field="healthRank" header="Client health" sortable body={(r: Row) => <HealthBadge health={r.perf.health} />} />
        </DataTable>
      )}
      <p className="mt-2 font-mono text-xs text-ink-muted">
        {filtered.length} of {rows.length} shown
      </p>
    </>
  );
}
