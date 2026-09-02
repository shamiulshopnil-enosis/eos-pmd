// Ported from the Next.js app's src/lib/permissions.ts (Milestones plan, Phase 3).
// Pure per-project role checks. Membership is matched by accepted userId only.

import { ForbiddenException } from "@nestjs/common";
import type { SessionUser, ClientContactRole, VendorTeamRole } from "./types";

type ProjectPeople = {
  vendorTeam: { userId: string | null; role: VendorTeamRole; invitePending: boolean }[];
  clientContacts: { userId: string | null; role: ClientContactRole; invitePending: boolean }[];
};

export function vendorRole(user: SessionUser | null, project: ProjectPeople): VendorTeamRole | null {
  if (!user) return null;
  const entry = project.vendorTeam.find((v) => !v.invitePending && v.userId === user.id);
  return entry ? entry.role : null;
}

export function clientRole(user: SessionUser | null, project: ProjectPeople): ClientContactRole | null {
  if (!user) return null;
  const entry = project.clientContacts.find((c) => !c.invitePending && c.userId === user.id);
  return entry ? entry.role : null;
}

export const isVendorOwner = (u: SessionUser | null, p: ProjectPeople) => vendorRole(u, p) === "owner";
export const isVendorMember = (u: SessionUser | null, p: ProjectPeople) => vendorRole(u, p) === "member";
export const isVendorTeamMember = (u: SessionUser | null, p: ProjectPeople) => vendorRole(u, p) !== null;
export const isPrimaryContact = (u: SessionUser | null, p: ProjectPeople) => clientRole(u, p) === "primary";
export const isCollaborator = (u: SessionUser | null, p: ProjectPeople) => clientRole(u, p) === "collaborator";
export const isClientContact = (u: SessionUser | null, p: ProjectPeople) => clientRole(u, p) !== null;

export const isProjectMember = (u: SessionUser | null, p: ProjectPeople) =>
  isVendorTeamMember(u, p) || isClientContact(u, p);

export const canEditMilestone = (u: SessionUser | null, p: ProjectPeople) => isVendorTeamMember(u, p);
export const canSendMilestone = (u: SessionUser | null, p: ProjectPeople) => isVendorTeamMember(u, p);
export const canManageProject = (u: SessionUser | null, p: ProjectPeople) => isVendorOwner(u, p);
export const canInviteTeammate = (u: SessionUser | null, p: ProjectPeople) => isVendorOwner(u, p);
export const canRequestCompletion = (u: SessionUser | null, p: ProjectPeople) => isVendorOwner(u, p);
/** Any client contact — primary or collaborator — may submit the one rating. */
export const canRateMilestone = (u: SessionUser | null, p: ProjectPeople) => isClientContact(u, p);
/** Vendor team or client contact — either side can attach files to a milestone. */
export const canAttachToMilestone = (u: SessionUser | null, p: ProjectPeople) => isProjectMember(u, p);
export const canConfirmCompletion = (u: SessionUser | null, p: ProjectPeople) => isPrimaryContact(u, p);
export const canInviteCollaborator = (u: SessionUser | null, p: ProjectPeople) => isPrimaryContact(u, p);
export const canRequestCapstone = (u: SessionUser | null, p: ProjectPeople) => isVendorOwner(u, p);
export const canSubmitCapstone = (u: SessionUser | null, p: ProjectPeople) => isPrimaryContact(u, p);

export function assertPermission(ok: boolean, message = "You do not have permission to do that."): void {
  if (!ok) throw new ForbiddenException(message);
}
