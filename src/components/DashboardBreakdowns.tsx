import Link from "next/link";
import type { ProjectWithMilestones } from "@/lib/types";
import {
  computeDeliveryWorkload,
  computeMilestoneStatusBreakdown,
  computeProjectProgress,
  computeRatingDistribution,
} from "@/lib/derived";
import { RatingBarChart } from "@/components/RatingBarChart";

const MAX_ROWS = 6;

const TONE_VAR: Record<string, string> = {
  good: "var(--rag-good)",
  warn: "var(--rag-warn)",
  bad: "var(--rag-bad)",
  slate: "var(--ink-subtle)",
};

function CardShell({
  title,
  hint,
  link,
  children,
}: {
  title: string;
  hint?: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-ledger border border-rule bg-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
        </div>
        {link ? (
          <Link href={link.href} className="shrink-0 text-xs text-link hover:text-link-strong">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-ink-muted">{children}</p>;
}

export function DashboardBreakdowns({ projects }: { projects: ProjectWithMilestones[] }) {
  const distribution = computeRatingDistribution(projects);
  const status = computeMilestoneStatusBreakdown(projects).filter((r) => r.count > 0);
  const progress = computeProjectProgress(projects);
  const workload = computeDeliveryWorkload(projects);

  const statusTotal = status.reduce((s, r) => s + r.count, 0);
  const workloadMax = Math.max(1, ...workload.map((w) => w.total));

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      {/* Rating distribution */}
      <CardShell
        title="Rating distribution"
        hint="Where client scores land across every reviewed milestone."
      >
        <RatingBarChart bars={distribution} />
      </CardShell>

      {/* Milestones by status */}
      <CardShell
        title="Milestones by status"
        hint={`${statusTotal} milestone${statusTotal === 1 ? "" : "s"} in the pipeline.`}
        link={{ href: "/milestones", label: "View all" }}
      >
        {status.length === 0 ? (
          <Empty>No milestones yet.</Empty>
        ) : (
          <ul className="space-y-1">
            {status.map((r) => (
              <li key={r.status}>
                <Link
                  href={`/milestones?status=${r.status}`}
                  className="-mx-1 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] px-1 py-1 text-sm transition-colors hover:bg-paper sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-3"
                >
                  <span className="truncate text-ink-muted">{r.label}</span>
                  <span className="h-2 min-w-0 rounded-full bg-band">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.max(r.pct, 2)}%`, background: TONE_VAR[r.tone] }}
                    />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink">
                    {r.count}
                    <span className="ml-1.5 text-ink-subtle">{Math.round(r.pct)}%</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardShell>

      {/* Project progress */}
      <CardShell
        title="Project progress"
        hint="Milestones reviewed vs still in flight."
        link={{ href: "/projects", label: "View all" }}
      >
        {progress.length === 0 ? (
          <Empty>No projects with milestones yet.</Empty>
        ) : (
          <>
            <ul className="space-y-3">
              {progress.slice(0, MAX_ROWS).map((r) => (
                <li key={r.id} className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <Link
                      href={`/projects/${r.id}`}
                      className="min-w-0 truncate font-medium text-ink hover:text-link hover:underline"
                    >
                      {r.name}
                    </Link>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
                      {r.reviewed}/{r.total} · {Math.round(r.pct)}%
                    </span>
                  </div>
                  <span className="flex h-2 overflow-hidden rounded-full bg-band">
                    <span
                      className="block h-full"
                      style={{ width: `${(r.reviewed / r.total) * 100}%`, background: "var(--rag-good)" }}
                    />
                    <span
                      className="block h-full"
                      style={{ width: `${(r.sent / r.total) * 100}%`, background: "var(--rag-warn)" }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-3 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--rag-good)" }} /> Reviewed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--rag-warn)" }} /> Review requested
              </span>
              {progress.length > MAX_ROWS ? (
                <span className="ml-auto text-ink-subtle">+{progress.length - MAX_ROWS} more</span>
              ) : null}
            </p>
          </>
        )}
      </CardShell>

      {/* Delivery workload */}
      <CardShell
        title="Delivery workload"
        hint="Milestones per teammate: open vs done."
        link={{ href: "/milestones", label: "View all" }}
      >
        {workload.length === 0 ? (
          <Empty>No milestones assigned yet.</Empty>
        ) : (
          <>
            <ul className="space-y-2.5">
              {workload.slice(0, MAX_ROWS).map((w) => (
                <li
                  key={w.key}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-3"
                >
                  <span
                    className={`truncate ${w.key === "__unassigned__" ? "italic text-ink-subtle" : "text-ink-muted"}`}
                  >
                    {w.name}
                  </span>
                  <span className="h-2 min-w-0 rounded-full bg-band">
                    <span
                      className="flex h-full overflow-hidden rounded-full"
                      style={{ width: `${Math.max((w.total / workloadMax) * 100, 3)}%` }}
                    >
                      <span className="block h-full" style={{ flexGrow: w.done, background: "var(--rag-good)" }} />
                      <span
                        className="block h-full"
                        style={{ flexGrow: w.open, background: "var(--ink-subtle)" }}
                      />
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink">
                    {w.total}
                    <span className="ml-1.5 text-ink-subtle">{w.open} open</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-3 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--rag-good)" }} /> Done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--ink-subtle)" }} /> Open
              </span>
              {workload.length > MAX_ROWS ? (
                <span className="ml-auto text-ink-subtle">+{workload.length - MAX_ROWS} more</span>
              ) : null}
            </p>
          </>
        )}
      </CardShell>
    </div>
  );
}
