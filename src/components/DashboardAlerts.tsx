"use client";

import { useState } from "react";
import Link from "next/link";
import type { AlertItem } from "@/lib/derived";
import { Icon } from "@/components/icon";

const INITIAL_VISIBLE = 5;

/** The dashboard "Attention" list. Shows the first few rows and reveals the
 *  rest behind a "See all" toggle so a long backlog doesn't dominate the page. */
export function DashboardAlerts({ alerts }: { alerts: AlertItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? alerts : alerts.slice(0, INITIAL_VISIBLE);
  const hiddenCount = alerts.length - INITIAL_VISIBLE;

  return (
    <>
      <ul className="divide-y divide-rule overflow-hidden rounded-ledger border border-l-[3px] border-rag-warn-fill bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))]">
        {visible.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="flex items-start gap-2 px-3 py-2.5 text-sm text-ink hover:bg-black/[0.03] hover:text-link dark:hover:bg-white/[0.04]"
            >
              <Icon
                name={a.severity === "critical" ? "warning" : "error"}
                className={`mt-0.5 shrink-0 text-[15px] ${
                  a.severity === "critical" ? "text-rag-bad" : "text-rag-warn"
                }`}
                fill
              />
              <span className="flex-1">{a.message}</span>
              <Icon name="chevron_right" className="mt-0.5 shrink-0 text-[16px] text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-link hover:text-link-strong"
          >
            {showAll ? "Show fewer" : `See all ${alerts.length}`}
            <Icon name={showAll ? "expand_less" : "expand_more"} className="text-[14px]" />
          </button>
        </div>
      ) : null}
    </>
  );
}
