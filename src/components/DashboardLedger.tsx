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
  RagDisc,
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

export function DashboardLedger({ rows }: { rows: LedgerRow[] }) {
  const [expanded, setExpanded] = useState<DataTableExpandedRows>({});

  return (
    <DataTable
      value={rows}
      dataKey="id"
      className="eos-table eos-ledger"
      expandedRows={expanded}
      onRowToggle={(e) => setExpanded(e.data as DataTableExpandedRows)}
      onRowClick={(e) => {
        const id = (e.data as LedgerRow).id;
        setExpanded((prev) => {
          const next = { ...(prev as Record<string, boolean>) };
          if (next[id]) delete next[id];
          else next[id] = true;
          return next;
        });
      }}
      rowClassName={() => "cursor-pointer"}
      rowExpansionTemplate={(r: LedgerRow) => (
        <div className="bg-paper px-3 py-2.5">
          <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink-muted">
            <span>
              Average <span className="text-ink">{r.avgText}</span>
            </span>
            <span>
              Latest <span className="text-ink">{r.latestText}</span>
            </span>
            <span>
              Reviewed <span className="text-ink">{r.reviewedText}</span>
            </span>
          </div>
          {r.milestones.length === 0 ? (
            <p className="py-1 text-sm text-ink-muted">No milestones yet.</p>
          ) : (
            <ul>
              {r.milestones.map((m) => (
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
          )}
          <Link
            href={r.href}
            className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:text-link-strong"
          >
            Open account
            <Icon name="arrow_forward" className="text-[13px]" />
          </Link>
        </div>
      )}
    >
      <Column expander style={{ width: "3rem" }} />
      <Column
        header="Client engagement"
        body={(r: LedgerRow) => (
          <div className="flex items-start gap-2">
            <RagDisc health={r.health} className="mt-1" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={r.href}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate font-medium text-ink hover:text-link hover:underline"
                >
                  {r.name}
                </Link>
                {r.visibility === "PUBLIC" ? <Icon name="public" className="shrink-0 text-[13px] text-ink-muted" /> : null}
                {r.declining ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-rag-warn"
                    title="Rating fell versus the previous milestone"
                  >
                    <Icon name="trending_down" className="text-[11px]" />
                    Declining
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                <span className="truncate">{r.client}</span>
                <ExecutionStatusBadge status={r.execStatus} />
              </div>
            </div>
          </div>
        )}
      />
      <Column
        header="Recent"
        align="center"
        body={(r: LedgerRow) => (
          <span className="text-ink-muted">
            <Sparkline values={r.spark} width={44} />
          </span>
        )}
      />
      <Column
        header="Latest"
        align="right"
        body={(r: LedgerRow) => (
          <span className="text-right">
            <span className="block font-mono text-sm font-medium tabular-nums text-ink">{r.latestText}</span>
            <span className="block font-mono text-[0.6875rem] tabular-nums text-ink-muted">{r.reviewedText}</span>
          </span>
        )}
      />
    </DataTable>
  );
}
