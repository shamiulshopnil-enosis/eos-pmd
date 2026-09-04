import { cookies } from "next/headers";

// The platform is one workspace, but a person can sit on the delivery side of
// some projects and the review (client) side of others. The role switch in the
// top bar picks which lens the whole UI is shown through; the choice rides in a
// non-httpOnly cookie so a server component can read it on the next request.

export type ViewMode = "delivery" | "client";

export const VIEW_MODE_COOKIE = "eos_view";
export const DEFAULT_VIEW_MODE: ViewMode = "delivery";

export function isViewMode(v: unknown): v is ViewMode {
  return v === "delivery" || v === "client";
}

/** Which sides of any project the signed-in user is actually on. */
export interface ProjectSides {
  delivery: boolean;
  review: boolean;
}

/**
 * Resolve the effective view mode from a requested mode and the user's real
 * capabilities. A single-sided user is always pinned to their one side; a
 * user on neither side falls back to the default so pages still render.
 */
export function resolveViewMode(requested: ViewMode | undefined, sides: ProjectSides): ViewMode {
  if (sides.delivery && !sides.review) return "delivery";
  if (sides.review && !sides.delivery) return "client";
  if (!sides.delivery && !sides.review) return DEFAULT_VIEW_MODE;
  return requested ?? DEFAULT_VIEW_MODE;
}

/** True when the switch should be offered — the user genuinely has both lenses. */
export function canSwitchViewMode(sides: ProjectSides): boolean {
  return sides.delivery && sides.review;
}

/** Read the raw requested mode from the cookie (unvalidated against capabilities). */
export async function getRequestedViewMode(): Promise<ViewMode | undefined> {
  const store = await cookies();
  const raw = store.get(VIEW_MODE_COOKIE)?.value;
  return isViewMode(raw) ? raw : undefined;
}

/** The effective mode for this request, given what the user can actually see. */
export async function getViewMode(sides: ProjectSides): Promise<ViewMode> {
  return resolveViewMode(await getRequestedViewMode(), sides);
}
