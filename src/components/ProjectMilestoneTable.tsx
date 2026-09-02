"use client";

import { useState } from "react";
import Link from "next/link";
import type { Milestone } from "@/lib/types";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, FlagBadge, MilestoneStatusBadge, StarRating } from "@/components/ui";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";

// One milestone list for the project page. Each row expands in place to show the
// full review breakdown, comment, reviewer and description — so there is no
// separate "review history" list.
export default function ProjectMilestoneTable({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3 font-medium">Milestone</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Start</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Reviewed</th>
            <th className="px-4 py-3 font-medium text-right">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {milestones.map((m) => {
            const open = openId === m.id;
            const reviewed = isMilestoneReviewed(m);
            return (
              <MilestoneRows
                key={m.id}
                projectId={projectId}
                milestone={m}
                open={open}
                reviewed={reviewed}
                onToggle={() => setOpenId(open ? null : m.id)}
              />
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function MilestoneRows({
  projectId,
  milestone: m,
  open,
  reviewed,
  onToggle,
}: {
  projectId: string;
  milestone: Milestone;
  open: boolean;
  reviewed: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
        onClick={onToggle}
      >
        <td className="px-2 py-3 text-center text-slate-400">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        </td>
        <td className="px-4 py-3">
          <Link
            href={`/projects/${projectId}/milestones/${m.id}`}
            className="font-medium text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {m.title}
          </Link>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <MilestoneStatusBadge status={m.status} />
            <FlagBadge flag={getMilestoneFlag(m)} />
          </div>
        </td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.startDate)}</td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.dueDate)}</td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.reviewedAt)}</td>
        <td className="px-4 py-3 text-right">
          {reviewed ? <StarRating value={m.rating} /> : <span className="text-slate-400">—</span>}
        </td>
      </tr>
      {open ? (
        <tr className="bg-slate-50/60 dark:bg-slate-800/30">
          <td />
          <td colSpan={6} className="px-4 pb-4 pt-1">
            <div className="space-y-3">
              {m.description ? (
                <div
                  className="text-sm text-slate-600 dark:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: m.description }}
                />
              ) : (
                <p className="text-sm text-slate-400">No description.</p>
              )}

              {m.url ? (
                <div className="text-sm">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {m.url}
                  </a>
                </div>
              ) : null}

              {m.assignees.length > 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Assigned to{" "}
                  {m.assignees.map((a) => a.name ?? a.email).join(", ")}
                </div>
              ) : null}

              {reviewed ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <MilestoneReviewSummary milestone={m} />
                  {m.comment ? (
                    <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">
                      &ldquo;{m.comment}&rdquo;
                    </p>
                  ) : null}
                  <div className="mt-2 text-xs text-slate-400">
                    Reviewed {formatDateTime(m.reviewedAt)}
                    {m.reviewedByName || m.reviewedByEmail
                      ? ` by ${m.reviewedByName ?? m.reviewedByEmail}`
                      : ""}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Not yet reviewed by the client.</p>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
