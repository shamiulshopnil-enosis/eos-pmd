"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { forceCompleteProject } from "@/lib/actions";
import { AdminStatusBadge, ListCard, ProjectTypeBadge } from "@/components/ui";

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
  const router = useRouter();
  return (
    <>
    <ul className="space-y-2 sm:hidden">
      {rows.map((p) => (
        <li key={p.id}>
          <ListCard href={`/admin/projects/${p.id}`}>
            <div className="font-medium text-ink">{p.name}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{p.clientCompanyName}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <ProjectTypeBadge type={p.projectType} />
              <AdminStatusBadge status={p.adminStatus} />
            </div>
            <div className="mt-2 text-xs text-ink-subtle">Updated {p.updatedAt}</div>
          </ListCard>
        </li>
      ))}
    </ul>
    <DataTable
      value={rows}
      dataKey="id"
      className="eos-table eos-rows-clickable hidden sm:block"
      tableStyle={{ minWidth: "760px" }}
      scrollable
      onRowClick={(e) => {
        if (window.getSelection()?.toString()) return;
        router.push(`/admin/projects/${(e.data as AdminProjectRow).id}`);
      }}
    >
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
    </>
  );
}

/** Completion-timeout list with a force-complete action per row. */
export function AdminTimeoutTable({ rows }: { rows: TimeoutRow[] }) {
  return (
    <>
    <ul className="space-y-2 sm:hidden">
      {rows.map((p) => (
        <li key={p.id} className="rounded-ledger border border-rule bg-panel p-3.5 text-sm">
          <Link href={`/admin/projects/${p.id}`} className="font-medium text-link hover:underline">
            {p.name}
          </Link>
          <div className="mt-0.5 text-xs text-ink-muted">{p.clientCompanyName}</div>
          <div className="mt-1 text-xs text-ink-subtle">Requested {p.completionRequestedAt}</div>
          <form action={forceCompleteProject.bind(null, p.id)} className="mt-2.5">
            <Button type="submit" outlined severity="danger" size="small" label="Force-complete" />
          </form>
        </li>
      ))}
    </ul>
    <DataTable value={rows} dataKey="id" className="eos-table hidden sm:block" tableStyle={{ minWidth: "640px" }} scrollable>
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
    </>
  );
}
