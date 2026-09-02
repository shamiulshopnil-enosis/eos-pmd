"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  Card,
  EmptyState,
  ExecutionStatusBadge,
  HealthBadge,
  ProjectStatusBadge,
  ProjectTypeBadge,
} from "@/components/ui";
import { FilterBar, FilterDateRange, FilterSelect, FilterText, SortHeader, cmp, nextSort } from "@/components/filters";

type SortKey =
  | "name"
  | "client"
  | "status"
  | "approval"
  | "execution"
  | "visibility"
  | "type"
  | "milestones"
  | "rating"
  | "health";

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

export default function ProjectsTable({ projects }: { projects: ProjectWithMilestones[] }) {
  const [f, setF] = useState({ ...EMPTY });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = useMemo(
    () => projects.map((project) => ({ project, perf: computeProjectPerformance(project) })),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = rows.filter(({ project, perf }) => {
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

    const val = (r: { project: ProjectWithMilestones; perf: ReturnType<typeof computeProjectPerformance> }) => {
      switch (sort.key) {
        case "name": return r.project.name.toLowerCase();
        case "client": return r.project.clientCompanyName.toLowerCase();
        case "status": return r.project.status;
        case "approval": return r.project.adminStatus;
        case "execution": return r.project.executionStatus;
        case "visibility": return r.project.visibility;
        case "type": return r.project.projectType;
        case "milestones": return r.perf.totalMilestones;
        case "rating": return r.perf.avgRating;
        case "health": return HEALTH_ORDER[r.perf.health] ?? 9;
      }
    };
    return [...out].sort((a, b) => {
      const d = cmp(val(a), val(b));
      return sort.dir === "asc" ? d : -d;
    });
  }, [rows, f, sort]);

  const active = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const onSort = (k: SortKey) => setSort((s) => nextSort(s, k));
  const th = (label: string, key: SortKey, align?: "left" | "right") => (
    <SortHeader label={label} sortKey={key} active={sort.key === key} dir={sort.dir} onSort={onSort} align={align} />
  );

  return (
    <>
      <FilterBar active={active} onClear={() => { setF({ ...EMPTY }); }}>
        <FilterText label="Search" value={f.q} onChange={(v) => set({ q: v })} placeholder="Project or client…" />
        <FilterSelect
          label="Status"
          value={f.status}
          onChange={(v) => set({ status: v })}
          options={[["", "Any"], ...Object.entries(PROJECT_STATUS_LABELS)]}
        />
        <FilterSelect
          label="Approval"
          value={f.approval}
          onChange={(v) => set({ approval: v })}
          options={[["", "Any"], ...Object.entries(ADMIN_STATUS_LABELS)]}
        />
        <FilterSelect
          label="Execution"
          value={f.execution}
          onChange={(v) => set({ execution: v })}
          options={[["", "Any"], ...Object.entries(EXECUTION_STATUS_LABELS)]}
        />
        <FilterSelect
          label="Visibility"
          value={f.visibility}
          onChange={(v) => set({ visibility: v })}
          width="w-36"
          options={[["", "Any"], ["PRIVATE", "Private"], ["PUBLIC", "Public"]]}
        />
        <FilterSelect
          label="Type"
          value={f.type}
          onChange={(v) => set({ type: v })}
          width="w-40"
          options={[["", "Any"], ...Object.entries(PROJECT_TYPE_LABELS)]}
        />
        <FilterSelect
          label="Client health"
          value={f.health}
          onChange={(v) => set({ health: v })}
          options={[["", "Any"], ...Object.entries(CLIENT_HEALTH_LABELS)]}
        />
        <FilterSelect
          label="Avg rating"
          value={f.rating}
          onChange={(v) => set({ rating: v })}
          width="w-32"
          options={RATING_BANDS}
        />
        <FilterDateRange
          label="Start date"
          from={f.startFrom}
          to={f.startTo}
          onFrom={(v) => set({ startFrom: v })}
          onTo={(v) => set({ startTo: v })}
        />
        <FilterDateRange
          label="Expected completion"
          from={f.dueFrom}
          to={f.dueTo}
          onFrom={(v) => set({ dueFrom: v })}
          onTo={(v) => set({ dueTo: v })}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No projects match your filters" description="Adjust or clear the filters above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                {th("Project", "name")}
                {th("Client", "client")}
                {th("Status", "status")}
                {th("Approval", "approval")}
                {th("Execution", "execution")}
                {th("Visibility", "visibility")}
                {th("Type", "type")}
                {th("Milestones", "milestones", "right")}
                {th("Avg. Rating", "rating", "right")}
                {th("Client Health", "health")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(({ project, perf }) => (
                <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{project.clientCompanyName}</td>
                  <td className="px-4 py-3"><ProjectStatusBadge status={project.status} /></td>
                  <td className="px-4 py-3"><AdminStatusBadge status={project.adminStatus} /></td>
                  <td className="px-4 py-3"><ExecutionStatusBadge status={project.executionStatus} /></td>
                  <td className="px-4 py-3">
                    <Badge tone={project.visibility === "PUBLIC" ? "blue" : "slate"}>
                      {project.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><ProjectTypeBadge type={project.projectType} /></td>
                  <td className="px-4 py-3 text-right">{perf.totalMilestones}</td>
                  <td className="px-4 py-3 text-right">{formatRating(perf.avgRating)}</td>
                  <td className="px-4 py-3"><HealthBadge health={perf.health} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-2 text-xs text-slate-400">
        {filtered.length} of {rows.length} shown
      </p>
    </>
  );
}
