"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableSortEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import type { MilestoneWithProject } from "@/lib/types";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { EmptyState, FlagBadge, ListCard, MilestoneStatusBadge, StarRating } from "@/components/ui";
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

type SortKey = "title" | "project" | "client" | "assignees" | "start" | "due" | "reviewed" | "status" | "rating";

const FLAG_OPTIONS = [
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE_SOON", label: "Due soon" },
  { value: "AWAITING_REVIEW", label: "Awaiting review" },
];

const RATING_OPTIONS = [
  { value: "5", label: "5.0" },
  { value: "4", label: "4.0 – 4.9" },
  { value: "3", label: "3.0 – 3.9" },
  { value: "2", label: "2.0 – 2.9" },
  { value: "1", label: "Below 2.0" },
  { value: "none", label: "Unrated" },
];

const INLINE_KEYS = ["status", "flag", "rating"];

const SORT_OPTIONS: { label: string; key: SortKey; dir: "asc" | "desc" }[] = [
  { label: "Due date (soonest)", key: "due", dir: "asc" },
  { label: "Due date (latest)", key: "due", dir: "desc" },
  { label: "Milestone (A–Z)", key: "title", dir: "asc" },
  { label: "Project (A–Z)", key: "project", dir: "asc" },
  { label: "Reviewed (newest)", key: "reviewed", dir: "desc" },
  { label: "Rating (high–low)", key: "rating", dir: "desc" },
];

type Row = {
  id: string;
  title: string;
  project: string;
  projectId: string;
  client: string;
  assignees: string;
  status: string;
  flag: string;
  ratingBand: string;
  start: number | null;
  due: number | null;
  reviewed: number | null;
  rating: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  reviewedAt: Date | null;
  m: MilestoneWithProject;
};

function ratingBand(r: number | null): string {
  if (r == null) return "none";
  if (r >= 5) return "5";
  const lo = Math.floor(r);
  return String(Math.min(4, Math.max(1, lo)));
}

function inRange(d: Date | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!d) return false;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}

const ACCESS: Record<string, (r: Row) => string> = {
  status: (r) => r.status,
  flag: (r) => r.flag,
  rating: (r) => r.ratingBand,
  project: (r) => r.projectId,
  client: (r) => r.client,
};

type DateModel = {
  startFrom: string;
  startTo: string;
  dueFrom: string;
  dueTo: string;
  reviewedFrom: string;
  reviewedTo: string;
};
const EMPTY_DATES: DateModel = {
  startFrom: "",
  startTo: "",
  dueFrom: "",
  dueTo: "",
  reviewedFrom: "",
  reviewedTo: "",
};

export default function MilestonesTable({ milestones }: { milestones: MilestoneWithProject[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const facets = useMemo<FilterFacet[]>(() => {
    const projectOpts = [...new Map(milestones.map((m) => [m.project.id, m.project.name])).entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const clientOpts = [...new Set(milestones.map((m) => m.project.clientCompanyName))]
      .sort()
      .map((c) => ({ value: c, label: c }));
    return [
      { key: "status", label: "Status", options: Object.entries(MILESTONE_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
      { key: "flag", label: "Flag", options: FLAG_OPTIONS },
      { key: "rating", label: "Rating", options: RATING_OPTIONS },
      { key: "project", label: "Project", options: projectOpts, searchable: true },
      { key: "client", label: "Client", options: clientOpts, searchable: true },
    ];
  }, [milestones]);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Selected>(() => {
    const base = emptySelection(facets);
    for (const f of facets) {
      const raw = params.get(f.key);
      if (raw) base[f.key] = raw.split(",").filter((v) => f.options.some((o) => o.value === v));
    }
    return base;
  });
  const [dates, setDates] = useState<DateModel>({ ...EMPTY_DATES });
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "due", dir: "asc" });

  const rows = useMemo<Row[]>(
    () =>
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        project: m.project.name,
        projectId: m.project.id,
        client: m.project.clientCompanyName,
        assignees: m.assignees.map((a) => a.name ?? a.email).join(", "),
        status: m.status,
        flag: getMilestoneFlag(m) ?? "",
        ratingBand: ratingBand(m.rating),
        start: m.startDate ? new Date(m.startDate).getTime() : null,
        due: m.dueDate ? new Date(m.dueDate).getTime() : null,
        reviewed: m.reviewedAt ? new Date(m.reviewedAt).getTime() : null,
        rating: m.rating,
        startDate: m.startDate,
        dueDate: m.dueDate,
        reviewedAt: m.reviewedAt,
        m,
      })),
    [milestones],
  );

  const passFacets = (r: Row, sel: Selected) =>
    facets.every((f) => {
      const picked = sel[f.key] ?? [];
      return picked.length === 0 || picked.includes(ACCESS[f.key](r));
    });

  const test = (r: Row, sel: Selected) => {
    const needle = q.trim().toLowerCase();
    if (needle && !`${r.title} ${r.project} ${r.client}`.toLowerCase().includes(needle)) return false;
    if (!passFacets(r, sel)) return false;
    if (!inRange(r.startDate, dates.startFrom, dates.startTo)) return false;
    if (!inRange(r.dueDate, dates.dueFrom, dates.dueTo)) return false;
    if (!inRange(r.reviewedAt, dates.reviewedFrom, dates.reviewedTo)) return false;
    return true;
  };

  const counts = useMemo(
    () => facetCounts(rows, facets, selected, test, (r, key) => ACCESS[key](r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, facets, selected, q, dates],
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

  const dateGroups: [string, string, string, string][] = [
    ["start", "Start date", dates.startFrom, dates.startTo],
    ["due", "Due date", dates.dueFrom, dates.dueTo],
    ["reviewed", "Reviewed", dates.reviewedFrom, dates.reviewedTo],
  ];
  const dateActive = dateGroups.filter(([, , a, b]) => a || b).length;
  const extraChips: ExtraChip[] = dateGroups
    .filter(([, , a, b]) => a || b)
    .map(([key, label, a, b]) => ({
      id: key,
      label: `${label}: ${a || "…"} – ${b || "…"}`,
      onRemove: () =>
        setDates((d) => ({ ...d, [`${key}From`]: "", [`${key}To`]: "" }) as DateModel),
    }));

  const clearAll = () => {
    setQ("");
    setSelected(emptySelection(facets));
    setDates({ ...EMPTY_DATES });
  };
  const anyActive = q.trim() !== "" || selectionCount(selected) > 0 || dateActive > 0;

  return (
    <>
      <FilterToolbar
        q={q}
        onQChange={setQ}
        searchPlaceholder="Search milestone, project, client…"
        facets={facets}
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
        drawerExtra={dateGroups.map(([key, label, from, to]) => (
          <FilterDateRange
            key={key}
            label={label}
            from={from}
            to={to}
            onFrom={(v) => setDates((d) => ({ ...d, [`${key}From`]: v }) as DateModel)}
            onTo={(v) => setDates((d) => ({ ...d, [`${key}To`]: v }) as DateModel)}
          />
        ))}
      />

      <ResultBar
        count={filtered.length}
        total={rows.length}
        noun="milestones"
        sort={sort}
        onSort={setSort}
        sortOptions={SORT_OPTIONS}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="filter_alt_off"
          title={anyActive ? "No milestones match your filters" : "No milestones yet"}
          description={anyActive ? "Adjust or clear the filters above." : "Milestones appear here once a project adds them."}
        />
      ) : (
        <>
        <ul className="space-y-2 sm:hidden">
          {sorted.map((r) => (
            <li key={r.id}>
              <ListCard href={`/projects/${r.projectId}/milestones/${r.id}`}>
                <div className="font-medium text-ink">{r.title}</div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {r.project} · {r.client}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <MilestoneStatusBadge status={r.status} />
                  <FlagBadge flag={getMilestoneFlag(r.m)} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-rule pt-2 font-mono text-xs text-ink-muted">
                  <span>Due {formatDate(r.m.dueDate)}</span>
                  {isMilestoneReviewed(r.m) ? <StarRating value={r.rating} /> : <span>Not reviewed</span>}
                </div>
                {r.assignees ? (
                  <div className="mt-1.5 text-xs text-ink-subtle">{r.assignees}</div>
                ) : null}
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
          tableStyle={{ minWidth: "1200px" }}
          scrollable
          onRowClick={(e) => {
            if (window.getSelection()?.toString()) return;
            const r = e.data as Row;
            router.push(`/projects/${r.projectId}/milestones/${r.id}`);
          }}
        >
          <Column
            field="title"
            header="Milestone"
            sortable
            style={{ minWidth: "14rem" }}
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
          <Column
            field="assignees"
            header="Assigned to"
            sortable
            style={{ minWidth: "11rem" }}
            body={(r: Row) =>
              r.assignees ? (
                <span className="text-ink-muted">{r.assignees}</span>
              ) : (
                <span className="text-ink-subtle">—</span>
              )
            }
          />
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
        </>
      )}
    </>
  );
}
