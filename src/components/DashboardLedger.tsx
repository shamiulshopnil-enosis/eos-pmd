"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableExpandedRows } from "primereact/datatable";
import { Column } from "primereact/column";
import type { ClientHealth } from "@/lib/constants";
import { Icon } from "@/components/icon";
import {
  ExecutionStatusBadge,
  MilestoneStatusBadge,
  Sparkline,
  StarRating,
} from "@/components/ui";

export type LedgerRow = {
  id: string;
  name: string;
  client: string;
  href: string;
  health: ClientHealth;
  latestText: string;
  avgText: string;
  reviewedText: string;
  execStatus: string;
  visibility: string;
  spark: number[];
  declining: boolean;
  milestones: {
    id: string;
    title: string;
    status: string;
    ratingText: string | null;
    due: string;
  }[];
};

/** One client company — the ledger line. Its projects (and their milestones)
 *  live in `projects` and appear when the row is expanded. */
export type ClientGroup = {
  id: string;
  client: string;
  health: ClientHealth;
  latestText: string;
  avgText: string;
  reviewedText: string;
  projectCount: number;
  needsAttention: boolean;
  projects: LedgerRow[];
};

function MilestoneList({ milestones }: { milestones: LedgerRow["milestones"] }) {
  if (milestones.length === 0) {
    return <p className="mt-1.5 py-1 text-sm text-ink-muted">No milestones yet.</p>;
  }
  return (
    <ul className="mt-1.5">
      {milestones.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 border-b border-rule py-1.5 text-sm last:border-0"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MilestoneStatusBadge status={m.status} />
            <span className="truncate text-ink">{m.title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {m.ratingText ? (
              <StarRating value={Number(m.ratingText)} />
            ) : (
              <span className="text-ink-muted">—</span>
            )}
            <span className="w-24 text-right font-mono text-[0.6875rem] text-ink-muted">{m.due}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProjectBlock({ p }: { p: LedgerRow }) {
  return (
    <div className="rounded-[6px] border border-rule bg-panel px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <Link
          href={p.href}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-ink hover:text-link hover:underline"
        >
          {p.name}
        </Link>
        {p.visibility === "PUBLIC" ? (
          <Icon name="public" className="shrink-0 text-[13px] text-ink-muted" />
        ) : null}
        {p.declining ? (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-rag-warn"
            title="Rating fell versus the previous milestone"
          >
            <Icon name="trending_down" className="text-[11px]" />
            Declining
          </span>
        ) : null}
        <ExecutionStatusBadge status={p.execStatus} />
        <span className="ml-auto text-ink-muted">
          <Sparkline values={p.spark} width={44} />
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-ink-muted">
        <span>
          Average <span className="text-ink">{p.avgText}</span>
        </span>
        <span>
          Latest <span className="text-ink">{p.latestText}</span>
        </span>
        <span>
          Reviewed <span className="text-ink">{p.reviewedText}</span>
        </span>
      </div>
      <MilestoneList milestones={p.milestones} />
      <Link
        href={p.href}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:text-link-strong"
      >
        Open project
        <Icon name="arrow_forward" className="text-[13px]" />
      </Link>
    </div>
  );
}

export function DashboardLedger({ groups }: { groups: ClientGroup[] }) {
  const [expanded, setExpanded] = useState<DataTableExpandedRows>({});

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {groups.map((g) => (
          <details
            key={g.id}
            className="group overflow-hidden rounded-[8px] border border-rule bg-panel"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{g.client}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {g.projectCount} project{g.projectCount === 1 ? "" : "s"} · {g.reviewedText} reviewed
                  {g.needsAttention ? (
                    <span className="text-rag-warn"> · needs attention</span>
                  ) : null}
                </span>
              </span>
              <Icon
                name="expand_more"
                className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-2.5 border-t border-rule bg-paper px-3 py-2.5">
              {g.projects.map((p) => (
                <ProjectBlock key={p.id} p={p} />
              ))}
            </div>
          </details>
        ))}
      </div>

      <DataTable
        value={groups}
        dataKey="id"
        className="eos-table eos-ledger hidden sm:block"
        expandedRows={expanded}
        onRowToggle={(e) => setExpanded(e.data as DataTableExpandedRows)}
        onRowClick={(e) => {
          const id = (e.data as ClientGroup).id;
          setExpanded((prev) => {
            const next = { ...(prev as Record<string, boolean>) };
            if (next[id]) delete next[id];
            else next[id] = true;
            return next;
          });
        }}
        rowClassName={() => "cursor-pointer"}
        rowExpansionTemplate={(g: ClientGroup) => (
          <div className="space-y-2.5 bg-paper px-3 py-3">
            {g.projects.map((p) => (
              <ProjectBlock key={p.id} p={p} />
            ))}
          </div>
        )}
      >
        <Column expander style={{ width: "3rem" }} />
        <Column
          header="Client"
          body={(g: ClientGroup) => (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-semibold text-ink">{g.client}</span>
                {g.needsAttention ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-rag-warn"
                    title="A project under this client is at risk or declining"
                  >
                    <Icon name="priority_high" className="text-[11px]" />
                    Attention
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {g.projectCount} project{g.projectCount === 1 ? "" : "s"}
              </div>
            </div>
          )}
        />
        <Column
          header="Average rating"
          align="right"
          body={(g: ClientGroup) => (
            <span className="block font-mono text-sm font-medium tabular-nums text-ink">
              {g.avgText}
            </span>
          )}
        />
        <Column
          header="Latest rating"
          align="right"
          body={(g: ClientGroup) => (
            <span className="block font-mono text-sm tabular-nums text-ink-muted">
              {g.latestText}
            </span>
          )}
        />
      </DataTable>
    </>
  );
}
