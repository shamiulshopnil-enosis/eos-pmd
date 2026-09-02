"use client";

import Link from "next/link";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { forceCompleteProject } from "@/lib/actions";
import { AdminStatusBadge, ProjectTypeBadge } from "@/components/ui";

export type AdminProjectRow = {
  id: string;
  name: string;
  clientCompanyName: string;
  projectType: string;
  adminStatus: string;
  updatedAt: string;
};

export type TimeoutRow = {
  id: string;
  name: string;
  clientCompanyName: string;
  completionRequestedAt: string;
};

/** Admin project list — PrimeReact <DataTable>. */
export function AdminProjectsTable({ rows }: { rows: AdminProjectRow[] }) {
  return (
    <DataTable value={rows} dataKey="id" className="eos-table" tableStyle={{ minWidth: "760px" }} scrollable>
      <Column
        header="Project"
        body={(p: AdminProjectRow) => (
          <Link href={`/admin/projects/${p.id}`} className="font-medium text-link hover:underline">
            {p.name}
          </Link>
        )}
      />
      <Column header="Client" body={(p: AdminProjectRow) => <span className="text-ink-muted">{p.clientCompanyName}</span>} />
      <Column header="Type" body={(p: AdminProjectRow) => <ProjectTypeBadge type={p.projectType} />} />
      <Column header="Approval" body={(p: AdminProjectRow) => <AdminStatusBadge status={p.adminStatus} />} />
      <Column header="Last updated" body={(p: AdminProjectRow) => <span className="text-ink-muted">{p.updatedAt}</span>} />
    </DataTable>
  );
}

/** Completion-timeout list with a force-complete action per row. */
export function AdminTimeoutTable({ rows }: { rows: TimeoutRow[] }) {
  return (
    <DataTable value={rows} dataKey="id" className="eos-table" tableStyle={{ minWidth: "640px" }} scrollable>
      <Column
        header="Project"
        body={(p: TimeoutRow) => (
          <Link href={`/admin/projects/${p.id}`} className="font-medium text-link hover:underline">
            {p.name}
          </Link>
        )}
      />
      <Column header="Client" body={(p: TimeoutRow) => <span className="text-ink-muted">{p.clientCompanyName}</span>} />
      <Column header="Requested" body={(p: TimeoutRow) => <span className="text-ink-muted">{p.completionRequestedAt}</span>} />
      <Column
        align="right"
        body={(p: TimeoutRow) => (
          <form action={forceCompleteProject.bind(null, p.id)}>
            <Button type="submit" outlined severity="danger" size="small" label="Force-complete" />
          </form>
        )}
      />
    </DataTable>
  );
}
