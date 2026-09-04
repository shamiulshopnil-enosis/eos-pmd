"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Card as PrimeCard } from "primereact/card";
import { Message } from "primereact/message";
import { Icon } from "@/components/icon";
import {
  PROJECT_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  type ClientHealth,
  CLIENT_HEALTH_LABELS,
  ADMIN_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
} from "@/lib/constants";

/* ------------------------------------------------------------------ *
 * Shared UI vocabulary, built on the PrimeReact component library.
 * Buttons are <Button>, tags are <Tag>, panels are <Card>, ratings are
 * <Rating>. The layout helpers (page header, section heading, empty
 * state) frame those components on the page.
 * ------------------------------------------------------------------ */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Legacy call sites pass padding utilities (p-4/p-5/p-6); PrimeReact <Card>
  // already pads its body, so drop those to avoid doubling up.
  const outer = className.replace(/\bp-\d+(\.\d+)?\b/g, "").trim();
  return <PrimeCard className={`eos-card ${outer}`}>{children}</PrimeCard>;
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action ? <div className="text-sm text-ink-muted">{action}</div> : null}
    </div>
  );
}

/**
 * The phone-width stand-in for a wide data-table row. Wide `<DataTable>`s are
 * kept in a `hidden sm:block` wrapper; below `sm` a list of these renders the
 * same rows as tap-friendly cards. Compose the body yourself.
 */
export function ListCard({ href, children }: { href?: string; children: ReactNode }) {
  const cls = "block rounded-ledger border border-rule bg-panel p-3.5 text-sm";
  return href ? (
    <Link href={href} className={`${cls} transition-colors active:border-link hover:border-link`}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** A label/value line for use inside <ListCard>. */
export function CardStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-right text-sm text-ink">{children}</span>
    </div>
  );
}

/* --- Tags (PrimeReact <Tag>) --------------------------------------- */

type Tone = "slate" | "blue" | "green" | "amber" | "red" | "purple";

const toneSeverity: Record<Tone, "info" | "success" | "warning" | "danger" | null> = {
  slate: null,
  blue: "info",
  green: "success",
  amber: "warning",
  red: "danger",
  purple: "info",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <Tag
      severity={toneSeverity[tone] ?? undefined}
      className={`eos-tag${tone === "slate" ? " eos-tag-slate" : ""}`}
      value={<span className="inline-flex items-center gap-1">{children}</span>}
    />
  );
}

const projectStatusTone: Record<string, Tone> = {
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
  ARCHIVED: "slate",
};
export function ProjectStatusBadge({ status }: { status: string }) {
  return <Badge tone={projectStatusTone[status] ?? "slate"}>{PROJECT_STATUS_LABELS[status] ?? status}</Badge>;
}

const milestoneStatusTone: Record<string, Tone> = {
  draft: "slate",
  overdue: "red",
  sent: "amber",
  reviewed: "green",
  rejected: "red",
};
export function MilestoneStatusBadge({ status }: { status: string }) {
  return <Badge tone={milestoneStatusTone[status] ?? "slate"}>{MILESTONE_STATUS_LABELS[status] ?? status}</Badge>;
}

const adminStatusTone: Record<string, Tone> = {
  draft: "slate",
  pending_approval: "amber",
  published: "green",
  rejected: "red",
  edited: "amber",
  trashed: "slate",
};
export function AdminStatusBadge({ status }: { status: string }) {
  return <Badge tone={adminStatusTone[status] ?? "slate"}>{ADMIN_STATUS_LABELS[status] ?? status}</Badge>;
}

const executionStatusTone: Record<string, Tone> = {
  ongoing: "blue",
  awaiting_completion: "amber",
  completed: "green",
};
export function ExecutionStatusBadge({ status }: { status: string }) {
  return <Badge tone={executionStatusTone[status] ?? "slate"}>{EXECUTION_STATUS_LABELS[status] ?? status}</Badge>;
}

/* --- Field icon chips ----------------------------------------------- *
 * A small categorical icon tag beside a label/value pair, used on the
 * Project, Milestone and public-preview detail pages wherever a plain <dl>
 * used to sit. The tone is purely categorical (what kind of field this is),
 * never a status signal — RAG badges (`Badge`, `HealthBadge`) still own
 * status. See DESIGN.md "Field icon chips" for the tone → meaning table. */

export type ChipTone =
  | "blue"
  | "indigo"
  | "green"
  | "amber"
  | "orange"
  | "purple"
  | "teal"
  | "rose"
  | "slate";

export function FieldIcon({
  icon,
  tone,
  size = "md",
}: {
  icon: string;
  tone: ChipTone;
  size?: "sm" | "md";
}) {
  return (
    <span className={`eos-chip-icon eos-chip-${tone} eos-chip-size-${size}`} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

/** A labelled overview field: an icon chip beside a stacked label/value. */
export function InfoField({
  icon,
  tone,
  label,
  value,
  mono,
}: {
  icon: string;
  tone: ChipTone;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <FieldIcon icon={icon} tone={tone} />
      <div className="min-w-0">
        <div className="text-xs font-medium text-ink-muted">{label}</div>
        <div className={`text-ink ${mono ? "font-mono text-xs" : "text-sm"}`}>{value || "—"}</div>
      </div>
    </div>
  );
}

/** A performance-rail row: icon + label on the left, value right-aligned. */
export function StatRow({
  icon,
  tone,
  label,
  value,
  strong,
}: {
  icon: string;
  tone: ChipTone;
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 text-sm text-ink-muted">
        <FieldIcon icon={icon} tone={tone} size="sm" />
        {label}
      </span>
      <span className={`font-mono tabular-nums text-ink ${strong ? "text-base font-semibold" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

/* --- Client health: icon + word --------------------------------- */

const healthIcon: Record<ClientHealth, { icon: string; cls: string }> = {
  HAPPY: { icon: "check_circle", cls: "text-rag-good" },
  NEEDS_ATTENTION: { icon: "error", cls: "text-rag-warn" },
  AT_RISK: { icon: "warning", cls: "text-rag-bad" },
  NO_DATA: { icon: "remove", cls: "text-ink-muted" },
};

export function HealthBadge({ health }: { health: ClientHealth }) {
  const h = healthIcon[health];
  return (
    <span className={`inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] ${h.cls}`}>
      <Icon name={h.icon} className="text-[13px]" />
      {CLIENT_HEALTH_LABELS[health]}
    </span>
  );
}

export function FlagBadge({ flag }: { flag: "OVERDUE" | "DUE_SOON" | "AWAITING_REVIEW" | null }) {
  if (!flag) return null;
  // Overdue is folded into the status badge itself (see getMilestoneDisplayStatus)
  // so it isn't shown twice.
  if (flag === "OVERDUE") return null;
  if (flag === "DUE_SOON")
    return (
      <Badge tone="amber">
        <Icon name="schedule" className="text-[11px]" />
        Due soon
      </Badge>
    );
  return (
    <Badge tone="amber">
      <Icon name="hourglass_top" className="text-[11px]" />
      Awaiting review
    </Badge>
  );
}

/* --- Rating: numeric score + thin meter (no stars) ------------------ */

function scoreColor(v: number) {
  if (v >= 4) return "var(--rag-good-fill)";
  if (v >= 3) return "var(--rag-warn-fill)";
  return "var(--rag-bad-fill)";
}

/** Kept as `StarRating` for call-site compatibility — renders a compact
 *  numeric score with a thin proportional meter, the enterprise register
 *  read rather than a row of stars. */
export function StarRating({ value, size = "sm" }: { value: number | null; size?: "sm" | "lg" }) {
  if (value == null) return <span className="text-sm text-ink-muted">Not rated</span>;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const big = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-2 ${big ? "eos-score-lg" : ""}`}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      <span className={`font-medium tabular-nums text-ink ${big ? "text-2xl" : "text-sm"}`}>
        {value.toFixed(1)}
      </span>
      <span className="eos-score-track" aria-hidden="true">
        <span style={{ width: `${pct}%`, background: scoreColor(value) }} />
      </span>
    </span>
  );
}

/** A run of recent ratings drawn as a thin plotted line (1–5 domain). */
export function Sparkline({
  values,
  className = "",
  width = 68,
  height = 18,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const pts = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (pts.length === 0) {
    return (
      <span className={`inline-block text-ink-muted ${className}`} aria-hidden="true">
        —
      </span>
    );
  }
  const pad = 2;
  const stepX = pts.length > 1 ? (width - pad * 2) / (pts.length - 1) : 0;
  const y = (v: number) => pad + (height - pad * 2) * (1 - (Math.max(1, Math.min(5, v)) - 1) / 4);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(pad + stepX * i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Recent ratings: ${pts.map((v) => v.toFixed(1)).join(", ")}`}
    >
      {pts.length > 1 ? (
        <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      ) : (
        <circle cx={width / 2} cy={y(pts[0])} r={1.6} fill="currentColor" />
      )}
    </svg>
  );
}

/* --- Buttons (PrimeReact <Button>) ------------------------------- */

function linkButtonClass(variant: "ink" | "ghost") {
  return [
    "p-button p-component eos-linkbtn",
    variant === "ink" ? "" : "p-button-outlined p-button-secondary",
  ].join(" ");
}

export function InkLink({ href, children, icon }: { href: string; children: ReactNode; icon?: string }) {
  return (
    <Link href={href} className={linkButtonClass("ink")}>
      {icon ? <Icon name={icon} className="p-button-icon p-button-icon-left" /> : null}
      <span className="p-button-label">{children}</span>
    </Link>
  );
}

export function GhostLink({ href, children, icon }: { href: string; children: ReactNode; icon?: string }) {
  return (
    <Link href={href} className={linkButtonClass("ghost")}>
      {icon ? <Icon name={icon} className="p-button-icon p-button-icon-left" /> : null}
      <span className="p-button-label">{children}</span>
    </Link>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string };

export function InkButton({ children, icon, className = "", ...props }: BtnProps) {
  return (
    <Button
      {...props}
      className={`eos-btn ${className}`}
      icon={icon ? <Icon name={icon} className="p-button-icon p-button-icon-left" /> : undefined}
      label={typeof children === "string" ? children : undefined}
    >
      {typeof children === "string" ? null : children}
    </Button>
  );
}

export function GhostButton({ children, icon, className = "", ...props }: BtnProps) {
  return (
    <Button
      {...props}
      outlined
      severity="secondary"
      className={`eos-btn ${className}`}
      icon={icon ? <Icon name={icon} className="p-button-icon p-button-icon-left" /> : undefined}
      label={typeof children === "string" ? children : undefined}
    >
      {typeof children === "string" ? null : children}
    </Button>
  );
}

export function LedgerLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`text-link underline decoration-rule-strong underline-offset-2 hover:text-link-strong hover:decoration-current ${className}`}
    >
      {children}
    </Link>
  );
}

/* --- Empty state & page header --------------------------------- */

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  actionIcon = "add",
  icon = "description",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[8px] border border-rule bg-panel px-6 py-14 text-center">
      <Icon name={icon} className="text-2xl text-ink-subtle" />
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-5">
          <InkLink href={actionHref} icon={actionIcon}>
            {actionLabel}
          </InkLink>
        </div>
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-link hover:text-link-strong"
          >
            <Icon name="arrow_back" className="text-[13px]" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold leading-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Inline informational banner — PrimeReact <Message>. */
export function InlineNote({
  severity = "info",
  children,
}: {
  severity?: "info" | "warn" | "success" | "error";
  children: ReactNode;
}) {
  const map = { info: "info", warn: "warn", success: "success", error: "error" } as const;
  return <Message severity={map[severity]} content={<div className="text-sm">{children}</div>} className="w-full justify-start" />;
}
