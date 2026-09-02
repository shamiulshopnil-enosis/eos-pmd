"use client";

import Link from "next/link";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { ClientHealth } from "@/lib/constants";
import { Badge, HealthBadge, ProjectStatusBadge, RagDisc } from "@/components/ui";

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
  return (
    <DataTable value={rows} dataKey="id" className="eos-table" tableStyle={{ minWidth: "960px" }} scrollable removableSort>
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
  );
}
