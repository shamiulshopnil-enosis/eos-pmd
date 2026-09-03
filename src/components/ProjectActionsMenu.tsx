"use client";

import { useRef, useState } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import type { ActivityWithMilestoneName } from "@/lib/types";
import { toastError, toastSuccess } from "@/components/toast";
import ActivityLogModal from "@/components/ActivityLogModal";

function isRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

export type MenuActionItem = {
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
  success?: string;
  danger?: boolean;
};

/** Approval-slot state for the project header — mutually exclusive. */
export type ApprovalState =
  | { kind: "submit"; action: () => void | Promise<void> }
  | { kind: "pending" }
  | { kind: "publish"; href: string }
  | { kind: "publicPage"; href: string }
  | null;

/**
 * The project header's "⋯" overflow. Keeps the top row to Edit + Add milestone
 * and tucks everything else — the activity log, the approval / publish flow, and
 * lifecycle actions like Request completion — behind one menu.
 */
export function ProjectActionsMenu({
  activities,
  approval,
  extras = [],
}: {
  activities: ActivityWithMilestoneName[];
  approval: ApprovalState;
  extras?: MenuActionItem[];
}) {
  const menu = useRef<Menu>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  const run = (a: MenuActionItem) => async () => {
    try {
      await a.action();
      if (a.success) toastSuccess(a.success);
    } catch (e) {
      if (isRedirect(e)) throw e;
      toastError("Something went wrong. Please try again.");
    }
  };

  const model: MenuItem[] = [
    {
      label: activities.length > 0 ? `Activity (${activities.length})` : "Activity",
      icon: "pi pi-history",
      command: () => setActivityOpen(true),
    },
  ];

  if (approval?.kind === "submit") {
    model.push({ label: "Submit for approval", icon: "pi pi-send", command: run({ label: "", action: approval.action, success: "Submitted for admin approval." }) });
  } else if (approval?.kind === "pending") {
    model.push({ label: "Pending admin approval", icon: "pi pi-hourglass", disabled: true });
  } else if (approval?.kind === "publish") {
    model.push({ label: "Publish project", icon: "pi pi-globe", url: approval.href });
  } else if (approval?.kind === "publicPage") {
    model.push({ label: "View public page", icon: "pi pi-globe", url: approval.href });
  }

  for (const a of extras) {
    model.push({
      label: a.label,
      icon: a.icon,
      className: a.danger ? "eos-menu-danger" : undefined,
      command: run(a),
    });
  }

  return (
    <>
      <Button
        type="button"
        outlined
        severity="secondary"
        icon="pi pi-ellipsis-h"
        aria-label="More actions"
        onClick={(e) => menu.current?.toggle(e)}
      />
      <Menu ref={menu} model={model} popup className="eos-menu-popup" />
      <ActivityLogModal activities={activities} open={activityOpen} onOpenChange={setActivityOpen} />
    </>
  );
}
