"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMyProjectSides } from "@/lib/data";
import {
  VIEW_MODE_COOKIE,
  canSwitchViewMode,
  isViewMode,
  type ViewMode,
} from "@/lib/view-mode";
import { SESSION_TTL_SECONDS } from "@/lib/session";

/**
 * Persist the top-bar role switch. Only honoured for users who are genuinely on
 * both sides of a project; everyone else is pinned to their one lens and the
 * request is a no-op.
 */
export async function setViewMode(mode: ViewMode): Promise<void> {
  await requireUser();
  if (!isViewMode(mode)) return;

  const sides = await getMyProjectSides().catch(() => ({ delivery: false, review: false }));
  if (!canSwitchViewMode(sides)) return;

  const store = await cookies();
  store.set(VIEW_MODE_COOKIE, mode, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  // Every page is shaped by the mode — refresh the whole app tree.
  revalidatePath("/", "layout");
}
