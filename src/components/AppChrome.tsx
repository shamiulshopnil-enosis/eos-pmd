"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { OverlayPanel } from "primereact/overlaypanel";
import { Badge } from "primereact/badge";
import { NavLinks } from "@/components/NavLinks";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { RecentActivity } from "@/lib/types";

/** Mobile nav drawer — PrimeReact <Sidebar> behind an icon <Button>. */
export function MobileMenu({ email, signOut }: { email: string; signOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        outlined
        severity="secondary"
        className="eos-icon-btn md:hidden"
        icon="pi pi-bars"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      />
      <Sidebar visible={open} onHide={() => setOpen(false)} className="eos-sidebar w-72">
        <div className="mb-2 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Register
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
        <div className="mt-4 border-t border-rule px-2 pt-3">
          <div className="truncate font-mono text-xs text-ink-muted">{email}</div>
          <form action={signOut} className="mt-1">
            <Button type="submit" text severity="secondary" size="small" label="Sign out" icon="pi pi-sign-out" />
          </form>
        </div>
      </Sidebar>
    </>
  );
}

/** Recent-activity dropdown — PrimeReact <OverlayPanel>. */
export function ActivityMenu({ activities }: { activities: RecentActivity[] }) {
  const op = useRef<OverlayPanel>(null);
  return (
    <>
      <Button
        type="button"
        outlined
        severity="secondary"
        size="small"
        className="eos-btn"
        icon="pi pi-history"
        onClick={(e) => op.current?.toggle(e)}
      >
        <span className="ml-1.5 hidden sm:inline">Log</span>
        {activities.length > 0 ? (
          <Badge value={activities.length} severity="secondary" className="ml-1.5" />
        ) : null}
      </Button>
      <OverlayPanel ref={op} className="eos-overlay w-[21rem] max-w-[calc(100vw-2rem)]">
        <div className="border-b border-rule pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          Recent activity
        </div>
        {activities.length === 0 ? (
          <div className="py-4 text-sm text-ink-muted">Nothing recorded yet.</div>
        ) : (
          <ul className="max-h-[24rem] divide-y divide-rule overflow-y-auto">
            {activities.map((a) => (
              <li key={a.id} className="py-2.5 text-sm">
                <div className="font-medium text-ink">{ACTIVITY_LABELS[a.type] ?? a.type}</div>
                <div className="text-ink-muted">{a.message}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="truncate">{a.project.name}</span>
                  <span className="shrink-0 font-mono">{formatDateTime(a.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </OverlayPanel>
    </>
  );
}
