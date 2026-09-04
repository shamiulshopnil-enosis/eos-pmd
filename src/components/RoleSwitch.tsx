"use client";

import { useTransition } from "react";
import { setViewMode } from "@/app/(app)/view-actions";
import type { ViewMode } from "@/lib/view-mode";

const OPTIONS: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: "delivery", label: "Delivery", icon: "pi pi-briefcase" },
  { mode: "client", label: "Client", icon: "pi pi-inbox" },
];

/**
 * Top-bar lens switch. Only mounted when the user is on both the delivery and
 * review side of a project; picking a side re-scopes the whole app (the server
 * action writes the `eos_view` cookie and revalidates the layout tree).
 */
export function RoleSwitch({ mode }: { mode: ViewMode }) {
  const [pending, startTransition] = useTransition();

  function choose(next: ViewMode) {
    if (next === mode || pending) return;
    startTransition(() => setViewMode(next));
  }

  return (
    <div
      role="group"
      aria-label="View as"
      className={`inline-flex overflow-hidden rounded-[6px] border border-rule bg-panel ${
        pending ? "opacity-60" : ""
      }`}
    >
      {OPTIONS.map((o) => {
        const active = o.mode === mode;
        return (
          <button
            key={o.mode}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(o.mode)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-band text-ink" : "text-ink-muted hover:bg-band/60 hover:text-ink"
            }`}
          >
            <span className={`${o.icon} text-xs`} aria-hidden />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
