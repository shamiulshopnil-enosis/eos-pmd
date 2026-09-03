"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableExpandedRows } from "primereact/datatable";
import { Column } from "primereact/column";
import type { Milestone } from "@/lib/types";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { formatDate, formatDateTime } from "@/lib/format";
import { FlagBadge, ListCard, MilestoneStatusBadge, StarRating } from "@/components/ui";
import { Icon } from "@/components/icon";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";

/** One milestone list for the project page. Each row expands in place (PrimeReact
 *  DataTable row expansion) to show the full review breakdown, comment, reviewer
 *  and description. */
export default function ProjectMilestoneTable({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const [expanded, setExpanded] = useState<DataTableExpandedRows>({});

  return (
    <>
    <ul className="space-y-2 sm:hidden">
      {milestones.map((m) => (
        <li key={m.id}>
          <ListCard href={`/projects/${projectId}/milestones/${m.id}`}>
            <div className="font-medium text-ink">{m.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <MilestoneStatusBadge status={m.status} />
              <FlagBadge flag={getMilestoneFlag(m)} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-2 font-mono text-xs text-ink-muted">
              <span>Due {formatDate(m.dueDate)}</span>
              {isMilestoneReviewed(m) ? <StarRating value={m.rating} /> : <span>Not reviewed</span>}
            </div>
            {m.assignees.length > 0 ? (
              <div className="mt-1.5 text-xs text-ink-subtle">
                {m.assignees.map((a) => a.name ?? a.email).join(", ")}
              </div>
            ) : null}
          </ListCard>
        </li>
      ))}
    </ul>
    <DataTable
      value={milestones}
      dataKey="id"
      className="eos-table hidden sm:block"
      expandedRows={expanded}
      onRowToggle={(e) => setExpanded(e.data as DataTableExpandedRows)}
      rowExpansionTemplate={(m: Milestone) => {
        const reviewed = isMilestoneReviewed(m);
        return (
          <div className="space-y-3 bg-paper px-3 py-3">
            {m.description ? (
              <div className="prose-ledger text-sm" dangerouslySetInnerHTML={{ __html: m.description }} />
            ) : (
              <p className="text-sm text-ink-muted">No description.</p>
            )}

            {m.url ? (
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-link underline underline-offset-2 hover:text-link-strong"
              >
                <Icon name="link" className="text-[13px]" />
                {m.url}
              </a>
            ) : null}

            {m.assignees.length > 0 ? (
              <div className="text-xs text-ink-muted">
                Assigned to {m.assignees.map((a) => a.name ?? a.email).join(", ")}
              </div>
            ) : null}

            {m.status === "rejected" ? (
              <div className="rounded-ledger border border-rule bg-panel p-3">
                <div className="text-sm font-medium text-rag-bad">
                  Rejected by {m.rejectedByName ?? m.rejectedByEmail ?? "the client"}
                  {m.rejectedAt ? ` · ${formatDateTime(m.rejectedAt)}` : ""}
                </div>
                {m.rejectionReason ? (
                  <p className="mt-1 text-sm italic text-ink-muted">&ldquo;{m.rejectionReason}&rdquo;</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-muted">Revise the milestone and send it back for review.</p>
              </div>
            ) : reviewed ? (
              <div className="rounded-ledger border border-rule bg-panel p-3">
                <MilestoneReviewSummary milestone={m} />
                {m.comment ? <p className="mt-2 text-sm italic text-ink-muted">&ldquo;{m.comment}&rdquo;</p> : null}
                <div className="mt-2 font-mono text-xs text-ink-muted">
                  Reviewed {formatDateTime(m.reviewedAt)}
                  {m.reviewedByName || m.reviewedByEmail ? ` by ${m.reviewedByName ?? m.reviewedByEmail}` : ""}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Not yet reviewed by the client.</p>
            )}
          </div>
        );
      }}
    >
      <Column expander style={{ width: "3rem" }} />
      <Column
        header="Milestone"
        body={(m: Milestone) => (
          <Link
            href={`/projects/${projectId}/milestones/${m.id}`}
            className="font-medium text-ink hover:text-link hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {m.title}
          </Link>
        )}
      />
      <Column
        header="Assigned to"
        style={{ minWidth: "10rem" }}
        body={(m: Milestone) =>
          m.assignees.length > 0 ? (
            <span className="text-ink-muted">{m.assignees.map((a) => a.name ?? a.email).join(", ")}</span>
          ) : (
            <span className="text-ink-subtle">—</span>
          )
        }
      />
      <Column
        header="Status"
        body={(m: Milestone) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <MilestoneStatusBadge status={m.status} />
            <FlagBadge flag={getMilestoneFlag(m)} />
          </span>
        )}
      />
      <Column header="Start" body={(m: Milestone) => <span className="font-mono text-xs text-ink-muted">{formatDate(m.startDate)}</span>} />
      <Column header="Due" body={(m: Milestone) => <span className="font-mono text-xs text-ink-muted">{formatDate(m.dueDate)}</span>} />
      <Column
        header="Rating"
        align="right"
        body={(m: Milestone) =>
          isMilestoneReviewed(m) ? <StarRating value={m.rating} /> : <span className="text-ink-muted">—</span>
        }
      />
    </DataTable>
    </>
  );
}
