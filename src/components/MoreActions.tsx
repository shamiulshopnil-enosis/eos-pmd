"use client";

import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { toastError, toastSuccess } from "@/components/toast";

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

export type MoreAction = {
  label: string;
  icon?: string;
  /** a bound server action, called with no arguments */
  action: () => void | Promise<void>;
  success?: string;
  danger?: boolean;
};

/** "More actions" overflow — keeps the action bar to its two or three
 *  primary buttons and tucks the rest behind a menu, as Jira does. */
export function MoreActions({ actions, label = "More actions" }: { actions: MoreAction[]; label?: string }) {
  const menu = useRef<Menu>(null);
  if (actions.length === 0) return null;

  const model: MenuItem[] = actions.map((a) => ({
    label: a.label,
    icon: a.icon,
    className: a.danger ? "eos-menu-danger" : undefined,
    command: async () => {
      try {
        await a.action();
        if (a.success) toastSuccess(a.success);
      } catch (e) {
        if (isRedirect(e)) throw e;
        toastError("Something went wrong. Please try again.");
      }
    },
  }));

  return (
    <>
      <Button
        type="button"
        outlined
        severity="secondary"
        icon="pi pi-ellipsis-h"
        aria-label={label}
        onClick={(e) => menu.current?.toggle(e)}
      />
      <Menu ref={menu} model={model} popup className="eos-menu-popup" />
    </>
  );
}
