"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { ClientHealth } from "@/lib/constants";
import { Badge, HealthBadge, ListCard, ProjectStatusBadge, RagDisc } from "@/components/ui";

export type PerfRow = {
  id: string;
  name: string;
  client: string;
  status: string;
  visibility: string;
  health: ClientHealth;
  active: number;
  total: number;
  reviewed: number;
  responseText: string;
  avgText: string;
  latestText: string;
  declined: boolean;
  lastActivityText: string;
};

/** The full project-performance record on the dashboard — PrimeReact <DataTable>. */
export function ProjectPerformanceTable({ rows }: { rows: PerfRow[] }) {
  const router = useRouter();
  return (
    <>
    <ul className="space-y-2 sm:hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <ListCard href={`/projects/${r.id}`}>
            <div className="flex items-start gap-2">
              <RagDisc health={r.health} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{r.name}</div>
                <div className="mt-0.5 text-xs text-ink-muted">{r.client}</div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <ProjectStatusBadge status={r.status} />
              <HealthBadge health={r.health} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-2 font-mono text-xs text-ink-muted">
              <span>{r.reviewed}/{r.total} reviewed</span>
              <span>Avg <span className="text-ink">{r.avgText}</span></span>
              <span className={r.declined ? "text-rag-warn" : ""}>Latest {r.latestText}</span>
              <span>Resp {r.responseText}</span>
            </div>
          </ListCard>
        </li>
      ))}
    </ul>
    <DataTable
      value={rows}
      dataKey="id"
      className="eos-table eos-rows-clickable hidden sm:block"
      tableStyle={{ minWidth: "960px" }}
      scrollable
      removableSort
      onRowClick={(e) => {
        if (window.getSelection()?.toString()) return;
        router.push(`/projects/${(e.data as PerfRow).id}`);
      }}
    >
      <Column
        field="name"
        header="Project"
        sortable
        body={(r: PerfRow) => (
          <span className="flex items-center gap-2">
            <RagDisc health={r.health} />
            <Link href={`/projects/${r.id}`} className="font-medium text-ink hover:text-link hover:underline">
              {r.name}
            </Link>
            {r.visibility === "PUBLIC" ? <Badge tone="blue">Public</Badge> : null}
          </span>
        )}
      />
      <Column field="client" header="Client" sortable body={(r: PerfRow) => <span className="text-ink-muted">{r.client}</span>} />
      <Column field="status" header="Status" sortable body={(r: PerfRow) => <ProjectStatusBadge status={r.status} />} />
      <Column field="active" header="Active" sortable align="right" body={(r: PerfRow) => <span className="font-mono tabular-nums text-ink">{r.active}</span>} />
      <Column field="total" header="Total" sortable align="right" body={(r: PerfRow) => <span className="font-mono tabular-nums text-ink">{r.total}</span>} />
      <Column field="reviewed" header="Reviewed" sortable align="right" body={(r: PerfRow) => <span className="font-mono tabular-nums text-ink">{r.reviewed}</span>} />
      <Column header="Response" align="right" body={(r: PerfRow) => <span className="font-mono tabular-nums text-ink-muted">{r.responseText}</span>} />
      <Column header="Avg" align="right" body={(r: PerfRow) => <span className="font-mono tabular-nums text-ink">{r.avgText}</span>} />
      <Column
        header="Latest"
        align="right"
        body={(r: PerfRow) => (
          <span className={`font-mono tabular-nums ${r.declined ? "text-rag-warn" : "text-ink"}`}>{r.latestText}</span>
        )}
      />
      <Column header="Client health" body={(r: PerfRow) => <HealthBadge health={r.health} />} />
      <Column header="Last activity" body={(r: PerfRow) => <span className="font-mono text-xs text-ink-muted">{r.lastActivityText}</span>} />
    </DataTable>
    </>
  );
}
