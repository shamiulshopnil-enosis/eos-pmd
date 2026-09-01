import Link from "next/link";
import type { ReactNode } from "react";
import { PROJECT_STATUS_LABELS, RELEASE_STATUS_LABELS, type ClientHealth, CLIENT_HEALTH_LABELS } from "@/lib/constants";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

const toneClasses: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  purple: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

const projectStatusTone: Record<string, keyof typeof toneClasses> = {
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
  ARCHIVED: "slate",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return <Badge tone={projectStatusTone[status] ?? "slate"}>{PROJECT_STATUS_LABELS[status] ?? status}</Badge>;
}

const releaseStatusTone: Record<string, keyof typeof toneClasses> = {
  DRAFT: "slate",
  IN_PROGRESS: "blue",
  DELIVERED: "purple",
  FEEDBACK_REQUESTED: "amber",
  REVIEWED: "green",
  CLOSED: "slate",
};

export function ReleaseStatusBadge({ status }: { status: string }) {
  return <Badge tone={releaseStatusTone[status] ?? "slate"}>{RELEASE_STATUS_LABELS[status] ?? status}</Badge>;
}

const healthTone: Record<ClientHealth, keyof typeof toneClasses> = {
  HAPPY: "green",
  NEEDS_ATTENTION: "amber",
  AT_RISK: "red",
  NO_DATA: "slate",
};

export function HealthBadge({ health }: { health: ClientHealth }) {
  return <Badge tone={healthTone[health]}>{CLIENT_HEALTH_LABELS[health]}</Badge>;
}

export function FlagBadge({ flag }: { flag: "OVERDUE" | "DUE_SOON" | "AWAITING_FEEDBACK" | null }) {
  if (!flag) return null;
  if (flag === "OVERDUE") return <Badge tone="red">Overdue</Badge>;
  if (flag === "DUE_SOON") return <Badge tone="amber">Due Soon</Badge>;
  return <Badge tone="amber">Feedback Pending</Badge>;
}

export function StarRating({ value, size = "sm" }: { value: number | null; size?: "sm" | "lg" }) {
  if (value == null) return <span className="text-slate-400">No rating yet</span>;
  const full = Math.round(value);
  const starClass = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={`inline-flex items-center gap-1 ${starClass}`} aria-label={`${value} out of 5`}>
      <span className="text-amber-400">{"★".repeat(full)}</span>
      <span className="text-slate-300 dark:text-slate-700">{"★".repeat(5 - full)}</span>
      <span className="ml-1 text-sm font-medium text-slate-600 dark:text-slate-400">{value.toFixed(1)}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      {sub ? <div className={`mt-1 text-xs ${toneClasses[tone]} inline-block rounded px-1.5 py-0.5`}>{sub}</div> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        {back ? (
          <Link href={back.href} className="mb-1 inline-block text-sm text-blue-600 hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
