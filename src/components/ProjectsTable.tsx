"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableSortEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import type { ProjectWithMilestones } from "@/lib/types";
import { computeProjectPerformance } from "@/lib/derived";
import {
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
  ListCard,
  ProjectTypeBadge,
  RagDisc,
} from "@/components/ui";
import {
  FilterDateRange,
  FilterToolbar,
  ResultBar,
  cmp,
  facetCounts,
  emptySelection,
  toggleValue,
  selectionCount,
  type ExtraChip,
  type FilterFacet,
  type Selected,
  type SortState,
} from "@/components/filters";

type SortKey = "name" | "client" | "milestones" | "rating" | "healthRank";

const HEALTH_ORDER: Record<string, number> = { HAPPY: 0, NEEDS_ATTENTION: 1, AT_RISK: 2, NO_DATA: 3 };

const FACETS: FilterFacet[] = [
  { key: "type", label: "Type", options: Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "health", label: "Client health", options: Object.entries(CLIENT_HEALTH_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "approval", label: "EOS approval", options: Object.entries(ADMIN_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "execution", label: "Execution", options: Object.entries(EXECUTION_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "visibility", label: "Visibility", options: [{ value: "PRIVATE", label: "Private" }, { value: "PUBLIC", label: "Public" }] },
  {
    key: "rating",
    label: "Avg. rating",
    options: [
      { value: "high", label: "4.0 and up" },
      { value: "mid", label: "3.0 – 3.9" },
      { value: "low", label: "Below 3.0" },
      { value: "none", label: "Unrated" },
    ],
  },
];

const INLINE_KEYS = ["type", "health"];

const SORT_OPTIONS: { label: string; key: SortKey; dir: "asc" | "desc" }[] = [
  { label: "Name (A–Z)", key: "name", dir: "asc" },
  { label: "Name (Z–A)", key: "name", dir: "desc" },
  { label: "Client (A–Z)", key: "client", dir: "asc" },
  { label: "Milestones (most first)", key: "milestones", dir: "desc" },
  { label: "Avg. rating (high–low)", key: "rating", dir: "desc" },
  { label: "Client health (worst first)", key: "healthRank", dir: "desc" },
];

type Row = {
  id: string;
  name: string;
  client: string;
  approval: string;
  execution: string;
  visibility: string;
  type: string;
  health: string;
  ratingBand: string;
  milestones: number;
  rating: number | null;
  healthRank: number;
  startDate: Date | null;
  dueDate: Date | null;
  perf: ReturnType<typeof computeProjectPerformance>;
};

function ratingBand(r: number | null): string {
  if (r == null) return "none";
  if (r >= 4) return "high";
  if (r >= 3) return "mid";
  return "low";
}

function inRange(d: Date | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!d) return false;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}

const ACCESS: Record<string, (r: Row) => string> = {
  type: (r) => r.type,
  health: (r) => r.health,
  approval: (r) => r.approval,
  execution: (r) => r.execution,
  visibility: (r) => r.visibility,
  rating: (r) => r.ratingBand,
};

type DateModel = { startFrom: string; startTo: string; dueFrom: string; dueTo: string };
const EMPTY_DATES: DateModel = { startFrom: "", startTo: "", dueFrom: "", dueTo: "" };

export default function ProjectsTable({ projects }: { projects: ProjectWithMilestones[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Selected>(() => {
    const base = emptySelection(FACETS);
    for (const f of FACETS) {
      const raw = params.get(f.key);
      if (raw) base[f.key] = raw.split(",").filter((v) => f.options.some((o) => o.value === v));
    }
    return base;
  });
  const [dates, setDates] = useState<DateModel>({ ...EMPTY_DATES });
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "name", dir: "asc" });

  const rows = useMemo<Row[]>(
    () =>
      projects.map((project) => {
        const perf = computeProjectPerformance(project);
        return {
          id: project.id,
          name: project.name,
          client: project.clientCompanyName,
          approval: project.adminStatus,
          execution: project.executionStatus,
          visibility: project.visibility,
          type: project.projectType,
          health: perf.health,
          ratingBand: ratingBand(perf.avgRating),
          milestones: perf.totalMilestones,
          rating: perf.avgRating,
          healthRank: HEALTH_ORDER[perf.health] ?? 9,
          startDate: project.startDate,
          dueDate: project.expectedCompletionDate,
          perf,
        };
      }),
    [projects],
  );

  const passFacets = (r: Row, sel: Selected) =>
    FACETS.every((f) => {
      const picked = sel[f.key] ?? [];
      return picked.length === 0 || picked.includes(ACCESS[f.key](r));
    });

  const test = (r: Row, sel: Selected) => {
    const needle = q.trim().toLowerCase();
    if (needle && !`${r.name} ${r.client}`.toLowerCase().includes(needle)) return false;
    if (!passFacets(r, sel)) return false;
    if (!inRange(r.startDate, dates.startFrom, dates.startTo)) return false;
    if (!inRange(r.dueDate, dates.dueFrom, dates.dueTo)) return false;
    return true;
  };

  const counts = useMemo(
    () => facetCounts(rows, FACETS, selected, test, (r, key) => ACCESS[key](r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, selected, q, dates],
  );

  const filtered = useMemo(
    () => rows.filter((r) => test(r, selected)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, selected, q, dates],
  );

  // Pre-sorted so the mobile card list matches the DataTable's own sort.
  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => cmp(a[sort.key], b[sort.key]) * dir);
  }, [filtered, sort]);

  const dateActive =
    (dates.startFrom || dates.startTo ? 1 : 0) + (dates.dueFrom || dates.dueTo ? 1 : 0);
  const extraChips: ExtraChip[] = [];
  if (dates.startFrom || dates.startTo)
    extraChips.push({
      id: "start",
      label: `Start: ${dates.startFrom || "…"} – ${dates.startTo || "…"}`,
      onRemove: () => setDates((d) => ({ ...d, startFrom: "", startTo: "" })),
    });
  if (dates.dueFrom || dates.dueTo)
    extraChips.push({
      id: "due",
      label: `Completion: ${dates.dueFrom || "…"} – ${dates.dueTo || "…"}`,
      onRemove: () => setDates((d) => ({ ...d, dueFrom: "", dueTo: "" })),
    });

  const clearAll = () => {
    setQ("");
    setSelected(emptySelection(FACETS));
    setDates({ ...EMPTY_DATES });
  };
  const anyActive = q.trim() !== "" || selectionCount(selected) > 0 || dateActive > 0;

  return (
    <>
      <FilterToolbar
        q={q}
        onQChange={setQ}
        searchPlaceholder="Search project or client…"
        facets={FACETS}
        inlineKeys={INLINE_KEYS}
        selected={selected}
        onToggle={(key, value) => setSelected((s) => toggleValue(s, key, value))}
        onClearFacet={(key) => setSelected((s) => ({ ...s, [key]: [] }))}
        onClearAll={clearAll}
        counts={counts}
        extraChips={extraChips}
        extraActiveCount={dateActive}
        resultCount={filtered.length}
        totalCount={rows.length}
        drawerExtra={
          <>
            <FilterDateRange
              label="Start date"
              from={dates.startFrom}
              to={dates.startTo}
              onFrom={(v) => setDates((d) => ({ ...d, startFrom: v }))}
              onTo={(v) => setDates((d) => ({ ...d, startTo: v }))}
            />
            <FilterDateRange
              label="Expected completion"
              from={dates.dueFrom}
              to={dates.dueTo}
              onFrom={(v) => setDates((d) => ({ ...d, dueFrom: v }))}
              onTo={(v) => setDates((d) => ({ ...d, dueTo: v }))}
            />
          </>
        }
      />

      <ResultBar
        count={filtered.length}
        total={rows.length}
        noun="projects"
        sort={sort}
        onSort={setSort}
        sortOptions={SORT_OPTIONS}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="filter_alt_off"
          title={anyActive ? "No projects match your filters" : "No projects yet"}
          description={anyActive ? "Adjust or clear the filters above." : "Create your first project to get started."}
        />
      ) : (
        <>
        <ul className="space-y-2 sm:hidden">
          {sorted.map((r) => (
            <li key={r.id}>
              <ListCard href={`/projects/${r.id}`}>
                <div className="flex items-start gap-2">
                  <RagDisc health={r.perf.health} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{r.name}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{r.client}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <ExecutionStatusBadge status={r.execution} />
                  <HealthBadge health={r.perf.health} />
                </div>
                <div className="mt-2.5 flex items-center gap-4 border-t border-rule pt-2 font-mono text-xs text-ink-muted">
                  <span>{r.milestones} milestone{r.milestones === 1 ? "" : "s"}</span>
                  <span>Avg {formatRating(r.rating)}</span>
                </div>
              </ListCard>
            </li>
          ))}
        </ul>
        <DataTable
          value={sorted}
          dataKey="id"
          removableSort
          sortField={sort.key}
          sortOrder={sort.dir === "asc" ? 1 : -1}
          onSort={(e: DataTableSortEvent) =>
            setSort({ key: e.sortField as SortKey, dir: e.sortOrder === 1 ? "asc" : "desc" })
          }
          className="eos-table eos-rows-clickable hidden sm:block"
          tableStyle={{ minWidth: "1180px" }}
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
            style={{ minWidth: "14rem" }}
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
          <Column field="approval" header="EOS approval" sortable body={(r: Row) => <AdminStatusBadge status={r.approval} />} />
        </DataTable>
        </>
      )}
    </>
  );
}
